import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole, isUuid } from "@/lib/crm/access";
import { setDevProfilePassword } from "@/lib/services/dev-profiles";

// Reveal the account password (admin/super-admin only). Fetched lazily on "Reveal" so the plaintext
// is never embedded in the page's RSC payload. RLS on dev_profile_secrets also enforces admin-only.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { data } = await createClient()
    .from("dev_profile_secrets")
    .select("account_password")
    .eq("dev_profile_id", params.id)
    .maybeSingle();
  return NextResponse.json({ password: data?.account_password ?? "" });
}

// Set/clear a dev profile's account password (admin/super-admin only; never BD).
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const { password } = await req.json();
    await setDevProfilePassword(createClient(), params.id, password ?? null, me.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
