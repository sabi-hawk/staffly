// Payroll generation (PRD §12 + v2 dynamic compensation). Net = base + Σ additions − deductions.
// Additions come from each employee's dynamic compensation_components. A payslip = a payroll_run
// plus its payslip_components (base/addition/deduction line items). Super-admin only (RLS).
import type { SupabaseClient } from "@supabase/supabase-js";
import { round2 } from "@/lib/hours";

export interface GenerateOptions {
  from: string; // YYYY-MM-DD
  to: string;
  generatedBy?: string;
}

function sum(xs: number[]) {
  return round2(xs.reduce((a, b) => a + b, 0));
}

/** Generate (or refresh) draft payroll runs + payslip line items for all active employees. */
export async function generatePayroll(supabase: SupabaseClient, opts: GenerateOptions) {
  const { data: salaries, error } = await supabase
    .from("salary_structures")
    .select("*")
    .eq("is_active", true);
  if (error) throw new Error(error.message);

  const runs = [];
  for (const sal of salaries ?? []) {
    const employeeId = sal.employee_id as string;

    // Never overwrite a FINALISED payslip: re-running "generate drafts" must not reset a locked run
    // to draft or wipe its (possibly hand-edited) lines. Check first — skip before any per-employee work.
    const { data: existingRun } = await supabase
      .from("payroll_runs")
      .select("status")
      .eq("employee_id", employeeId)
      .eq("period_start", opts.from)
      .eq("period_end", opts.to)
      .maybeSingle();
    if (existingRun?.status === "finalised") continue;

    const base = round2(Number(sal.base_salary) || 0);

    // These four reads are independent of each other — fetch them concurrently (was a sequential N+1).
    const [wdRes, attRes, leavesRes, compsRes] = await Promise.all([
      supabase.rpc("working_days", { p_employee: employeeId, p_start: opts.from, p_end: opts.to }),
      supabase
        .from("attendance")
        .select("total_hours, extra_hours, deficit_hours, check_out_time")
        .eq("employee_id", employeeId)
        .gte("work_date", opts.from)
        .lte("work_date", opts.to),
      supabase
        .from("leave_requests")
        .select("days_count")
        .eq("employee_id", employeeId)
        .eq("type", "unpaid")
        .eq("status", "approved")
        .gte("start_date", opts.from)
        .lte("end_date", opts.to),
      supabase
        .from("compensation_components")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("is_active", true)
        .eq("recurring", true),
    ]);

    const workingDays = Number(wdRes.data) || 0;

    const att = attRes.data;
    const present = (att ?? []).filter((a) => a.check_out_time).length;
    const totalHours = sum((att ?? []).map((a) => Number(a.total_hours) || 0));
    const totalExtra = sum((att ?? []).map((a) => Number(a.extra_hours) || 0));
    const totalDeficit = sum((att ?? []).map((a) => Number(a.deficit_hours) || 0));

    const leaves = leavesRes.data;
    const unpaidDays = sum((leaves ?? []).map((l) => Number(l.days_count) || 0));
    const deductions = workingDays > 0 ? round2((unpaidDays * base) / workingDays) : 0;

    // dynamic additions = recurring compensation components
    const comps = compsRes.data;
    const additions = (comps ?? []).map((c) => ({ label: c.label, amount: round2(Number(c.amount) || 0), description: c.description }));
    const additionsTotal = sum(additions.map((a) => a.amount));

    const netPay = round2(base + additionsTotal - deductions);

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
      base_salary: base,
      additions_total: additionsTotal,
      deductions,
      net_pay: netPay,
      status: "draft" as const,
      generated_by: opts.generatedBy ?? null,
    };

    const { data: run, error: upErr } = await supabase
      .from("payroll_runs")
      .upsert(row, { onConflict: "employee_id,period_start,period_end" })
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);

    // rebuild payslip line items for a draft run
    if (run.status === "draft") {
      await supabase.from("payslip_components").delete().eq("payroll_run_id", run.id);
      const lines = [
        { payroll_run_id: run.id, label: "Base salary", amount: base, kind: "base", description: null },
        ...additions.map((a) => ({ payroll_run_id: run.id, label: a.label, amount: a.amount, kind: "addition", description: a.description })),
      ];
      if (deductions > 0)
        lines.push({ payroll_run_id: run.id, label: "Unpaid leave deduction", amount: deductions, kind: "deduction", description: `${unpaidDays} unpaid day(s)` });
      await supabase.from("payslip_components").insert(lines);
    }

    runs.push(run);
  }
  return runs;
}

/** Recompute a run's totals from its payslip_components (after manual line edits). Refuses a finalised run. */
export async function recomputeRun(supabase: SupabaseClient, runId: string) {
  await assertNotFinalised(supabase, runId);
  const { data: lines } = await supabase.from("payslip_components").select("*").eq("payroll_run_id", runId);
  const base = sum((lines ?? []).filter((l) => l.kind === "base").map((l) => Number(l.amount)));
  const additions = sum((lines ?? []).filter((l) => l.kind === "addition").map((l) => Number(l.amount)));
  const deductions = sum((lines ?? []).filter((l) => l.kind === "deduction").map((l) => Number(l.amount)));
  const net = round2(base + additions - deductions);
  const { data } = await supabase
    .from("payroll_runs")
    .update({ base_salary: base, additions_total: additions, deductions, net_pay: net })
    .eq("id", runId)
    .select()
    .single();
  return data;
}

/** Throw if the payroll run is finalised (locked) — payslip lines/totals are then immutable. */
async function assertNotFinalised(supabase: SupabaseClient, runId: string) {
  const { data } = await supabase.from("payroll_runs").select("status").eq("id", runId).maybeSingle();
  if (data?.status === "finalised") throw new Error("This payslip is finalised and can no longer be edited");
}

/** Add a payslip line item, then recompute the run's totals. */
export async function addPayslipLine(
  supabase: SupabaseClient,
  runId: string,
  line: { label: string; amount: number; kind: "addition" | "deduction"; description?: string }
) {
  await assertNotFinalised(supabase, runId);
  await supabase.from("payslip_components").insert({ payroll_run_id: runId, ...line, description: line.description ?? null });
  return recomputeRun(supabase, runId);
}
export async function removePayslipLine(supabase: SupabaseClient, lineId: string, runId: string) {
  await assertNotFinalised(supabase, runId);
  await supabase.from("payslip_components").delete().eq("id", lineId);
  return recomputeRun(supabase, runId);
}

/** Finalise (lock) a run. */
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

/** Mark a run paid (or back to pending). */
export async function setPaymentStatus(
  supabase: SupabaseClient,
  id: string,
  opts: { status: "paid" | "pending"; paidAt?: string; creditedAccount?: string; paidAmount?: number }
) {
  const patch =
    opts.status === "paid"
      ? {
          payment_status: "paid",
          paid_at: opts.paidAt ?? new Date().toISOString(),
          credited_account: opts.creditedAccount ?? null,
          paid_amount: opts.paidAmount ?? null,
        }
      : { payment_status: "pending", paid_at: null, credited_account: null, paid_amount: null };
  const { data, error } = await supabase.from("payroll_runs").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// Back-compat for older callers/tests.
export async function updatePayrollRun(
  supabase: SupabaseClient,
  id: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await supabase.from("payroll_runs").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
