import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionHasPerm } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { generatePayroll } from "@/lib/services/payroll";

// Recompute a single draft run for its own period — re-runs generation for just this employee, so
// mid-month missing-attendance deductions shrink as days pass (they only count PAST days). Preserves
// dismissed lines. Refuses a finalised run.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sessionHasPerm(supabase, PERM.payrollManage)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: run } = await supabase.from("payroll_runs").select("employee_id, period_start, period_end, status").eq("id", params.id).single();
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  if (run.status === "finalised") return NextResponse.json({ error: "This payslip is finalised" }, { status: 400 });
  try {
    await generatePayroll(supabase, { from: run.period_start, to: run.period_end, employeeId: run.employee_id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
