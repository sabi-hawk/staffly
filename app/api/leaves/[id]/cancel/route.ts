import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Employee cancels their OWN pending leave request (or admin cancels any pending one).
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: req } = await supabase.from("leave_requests").select("employee_id, status").eq("id", params.id).single();
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canApprove = (await supabase.rpc("auth_has_perm", { p_perm: "leaves.approve" })).data === true;
  if (req.employee_id !== user.id && !canApprove) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (req.status !== "pending") return NextResponse.json({ error: "Only pending requests can be cancelled" }, { status: 400 });

  // RLS restricts leave_requests updates to admins, so apply the cancel with the service role
  // after the ownership/pending check above.
  const admin = createAdminClient();
  const { error } = await admin.from("leave_requests").update({ status: "cancelled" }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
