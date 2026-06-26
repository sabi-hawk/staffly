// Payroll generation (PRD §12). Aggregates attendance + leave, then uses the pure
// lib/payroll math. Salary/payroll access is super_admin-only (enforced by RLS).
import type { SupabaseClient } from "@supabase/supabase-js";
import { computePayroll, type SalaryType, type Benefit } from "@/lib/payroll";

export interface GenerateOptions {
  from: string; // YYYY-MM-DD
  to: string;
  generatedBy?: string;
}

/** Generate draft payroll runs for every employee with an active salary structure. */
export async function generatePayroll(supabase: SupabaseClient, opts: GenerateOptions) {
  const { data: salaries, error } = await supabase
    .from("salary_structures")
    .select("*")
    .eq("is_active", true);
  if (error) throw new Error(error.message);

  const runs = [];
  for (const sal of salaries ?? []) {
    const employeeId = sal.employee_id as string;

    const workingDays =
      Number(
        (await supabase.rpc("working_days", { p_employee: employeeId, p_start: opts.from, p_end: opts.to }))
          .data
      ) || 0;

    const { data: att } = await supabase
      .from("attendance")
      .select("total_hours, extra_hours, deficit_hours, check_out_time")
      .eq("employee_id", employeeId)
      .gte("work_date", opts.from)
      .lte("work_date", opts.to);

    const present = (att ?? []).filter((a) => a.check_out_time).length;
    const totalHours = sum((att ?? []).map((a) => Number(a.total_hours) || 0));
    const totalExtra = sum((att ?? []).map((a) => Number(a.extra_hours) || 0));
    const totalDeficit = sum((att ?? []).map((a) => Number(a.deficit_hours) || 0));

    const { data: leaves } = await supabase
      .from("leave_requests")
      .select("days_count, type, status")
      .eq("employee_id", employeeId)
      .eq("type", "unpaid")
      .eq("status", "approved")
      .gte("start_date", opts.from)
      .lte("end_date", opts.to);
    const unpaidDays = sum((leaves ?? []).map((l) => Number(l.days_count) || 0));

    const result = computePayroll({
      salaryType: sal.type as SalaryType,
      baseSalary: Number(sal.base_salary),
      overtimeRateHour: Number(sal.overtime_rate_hour),
      totalExtraHours: totalExtra,
      commissionAmount: 0, // entered by admin later for commission staff
      benefits: (sal.benefits as Benefit[]) ?? [],
      workingDays,
      unpaidDays,
    });

    const row = {
      employee_id: employeeId,
      period_start: opts.from,
      period_end: opts.to,
      working_days: workingDays,
      days_present: present,
      unpaid_days: unpaidDays,
      total_hours: totalHours,
      total_extra_hours: totalExtra,
      total_deficit_hours: totalDeficit,
      base_salary: result.baseSalary,
      overtime_pay: result.overtimePay,
      commission_amount: result.commissionAmount,
      benefits_total: result.benefitsTotal,
      deductions: result.deductions,
      net_pay: result.netPay,
      status: "draft" as const,
      generated_by: opts.generatedBy ?? null,
    };

    const { data, error: upErr } = await supabase
      .from("payroll_runs")
      .upsert(row, { onConflict: "employee_id,period_start,period_end" })
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);
    runs.push(data);
  }
  return runs;
}

/** Edit a draft run (e.g. enter commission for commission staff) and recompute net. */
export async function updatePayrollRun(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{
    commission_amount: number;
    deductions: number;
    overtime_pay: number;
    benefits_total: number;
    notes: string;
  }>
) {
  const { data: run, error } = await supabase.from("payroll_runs").select("*").eq("id", id).single();
  if (error || !run) throw new Error("Run not found");

  const merged = { ...run, ...patch };
  const net =
    Number(merged.base_salary) +
    Number(merged.overtime_pay) +
    Number(merged.commission_amount) +
    Number(merged.benefits_total) -
    Number(merged.deductions);

  const { data, error: e2 } = await supabase
    .from("payroll_runs")
    .update({ ...patch, net_pay: Math.round(net * 100) / 100 })
    .eq("id", id)
    .select()
    .single();
  if (e2) throw new Error(e2.message);
  return data;
}

/** Finalise a run: lock it (status finalised, finalised_at set). */
export async function finalisePayroll(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("payroll_runs")
    .update({ status: "finalised", finalised_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

function sum(xs: number[]) {
  return Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
}
