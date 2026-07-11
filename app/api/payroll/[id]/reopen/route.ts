import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionHasPerm } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { reopenPayroll } from "@/lib/services/payroll";

// Reopen a finalised payslip back to draft so it can be edited/regenerated. payroll.manage only.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sessionHasPerm(supabase, PERM.payrollManage)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const run = await reopenPayroll(supabase, params.id);
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
