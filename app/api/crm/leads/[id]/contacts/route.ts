import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isUuid } from "@/lib/crm/access";
import { createLeadContact } from "@/lib/services/lead-contacts";

// Add a company-side contact to a lead. RLS (lead_contacts_scoped) enforces that the caller owns the
// parent lead (or is BD-Lead/admin); canSeeCrm is the coarse gate.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const body = await req.json();
    const id = await createLeadContact(createClient(), params.id, body, me.id);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
