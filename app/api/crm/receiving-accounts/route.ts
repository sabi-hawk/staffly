import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isSuperAdminRole } from "@/lib/crm/access";
import { createAccount } from "@/lib/services/crm-deals";

export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.dealsManage)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const id = await createAccount(createClient(), await req.json());
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
