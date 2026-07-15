import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { createDeal, setDealWorkingDevelopers } from "@/lib/services/crm-deals";

// Deals are admin/super-admin only.
export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.dealsManage)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const supabase = createClient();
    const body = await req.json();
    const id = await createDeal(supabase, body);
    if (Array.isArray(body.developers)) await setDealWorkingDevelopers(supabase, id, body.developers);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
