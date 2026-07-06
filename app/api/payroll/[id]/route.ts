import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionHasPerm } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { updatePayrollRun } from "@/lib/services/payroll";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sessionHasPerm(supabase, PERM.payrollManage)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  try {
    const run = await updatePayrollRun(supabase, params.id, body);
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
