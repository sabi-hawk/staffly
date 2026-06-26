import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decideLeave } from "@/lib/services/leaves";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.status !== "approved" && body.status !== "rejected")
    return NextResponse.json({ error: "status must be approved|rejected" }, { status: 400 });

  try {
    const result = await decideLeave(supabase, params.id, user.id, {
      status: body.status,
      note: body.note,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
