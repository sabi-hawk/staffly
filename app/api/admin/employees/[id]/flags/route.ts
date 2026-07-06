import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isUuid } from "@/lib/crm/access";

// Set an employee's privileged flags (admin/super). The DB guard trigger (0031) also enforces that
// only admins may change these columns; role changes stay super-admin-only.
const BOOL = (v: unknown) => v === true;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.employeesFlags)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const body = await req.json();
    const { error } = await createClient()
      .from("profiles")
      .update({
        is_developer: BOOL(body.is_developer),
        is_bd_lead: BOOL(body.is_bd_lead),
        is_deal_developer: BOOL(body.is_deal_developer),
      })
      .eq("id", params.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
