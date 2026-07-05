import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isUuid } from "@/lib/crm/access";
import { updateLeadContact, deleteLeadContact } from "@/lib/services/lead-contacts";

// Update / delete a lead contact. RLS (lead_contacts_scoped) enforces ownership of the parent lead.
export async function PATCH(req: Request, { params }: { params: { contactId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.contactId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    await updateLeadContact(createClient(), params.contactId, await req.json());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { contactId: string } }) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeCrm(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isUuid(params.contactId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    await deleteLeadContact(createClient(), params.contactId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
