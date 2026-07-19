// Payroll generation (PRD §12 + v2 dynamic compensation). Net = base + Σ additions − deductions.
// Additions come from each employee's dynamic compensation_components. A payslip = a payroll_run
// plus its payslip_components (base/addition/deduction line items). Super-admin only (RLS).
import type { SupabaseClient } from "@supabase/supabase-js";
import { round2 } from "@/lib/hours";
import { companyToday } from "@/lib/time";

export interface GenerateOptions {
  from: string; // YYYY-MM-DD
  to: string;
  generatedBy?: string;
  employeeId?: string; // restrict to a single employee (per-run "recompute")
}

function sum(xs: number[]) {
  return round2(xs.reduce((a, b) => a + b, 0));
}

interface CommissionLine { label: string; amount: number; description: string }

/** A BD's deal commissions for a payroll period. For a % line, the base is the SUM of that deal's
 * payments whose billing_month falls in the period (so an Aug-received / July-billed payment counts on
 * July's slip). A fixed line is a flat one-off. The label is BD-safe ("Commission — {company}"); the
 * admin breakdown (rate · total received) rides in the description for the super-admin payslip view. */
async function computeDealCommissions(
  supabase: SupabaseClient,
  employeeId: string,
  from: string,
  to: string
): Promise<CommissionLine[]> {
  const { data: rows } = await supabase
    .from("deal_commissions")
    .select("rate, fixed_amount, label, deal_id, deal:deals(name, lead:leads(company))")
    .eq("employee_id", employeeId)
    .eq("is_active", true);
  if (!rows?.length) return [];

  const monthStart = `${from.slice(0, 7)}-01`; // billing months are first-of-month
  const lines: CommissionLine[] = [];
  for (const r of rows as any[]) {
    const company = r.deal?.name || r.deal?.lead?.company || "Deal";
    const label = r.label || `Commission — ${company}`;
    if (r.fixed_amount != null) {
      lines.push({ label, amount: round2(Number(r.fixed_amount) || 0), description: `Fixed commission for ${company}` });
      continue;
    }
    const { data: pays } = await supabase
      .from("deal_payments")
      .select("amount")
      .eq("deal_id", r.deal_id)
      .gte("billing_month", monthStart)
      .lte("billing_month", to);
    const received = sum((pays ?? []).map((p) => Number(p.amount) || 0));
    const rate = Number(r.rate) || 0;
    lines.push({
      label,
      amount: round2((rate / 100) * received),
      description: `${rate}% of ${received.toLocaleString("en-PK")} received for ${company} (billed in period, ${(pays ?? []).length} payment(s))`,
    });
  }
  return lines;
}

/** Generate (or refresh) draft payroll runs + payslip line items for every PAYABLE employee — anyone with
 * a base salary, active deal commissions, or recurring compensation this period. A commission-only partner
 * (base 0, no salary_structure) is therefore included; `payroll_exempt` employees (e.g. the founder) and
 * inactive/non-employee accounts are always skipped. */
export async function generatePayroll(supabase: SupabaseClient, opts: GenerateOptions) {
  const [salRes, dcRes, compRes] = await Promise.all([
    supabase.from("salary_structures").select("employee_id, base_salary").eq("is_active", true),
    supabase.from("deal_commissions").select("employee_id").eq("is_active", true),
    supabase.from("compensation_components").select("employee_id").eq("is_active", true).eq("recurring", true),
  ]);
  if (salRes.error) throw new Error(salRes.error.message);
  const baseByEmp = new Map<string, number>((salRes.data ?? []).map((s: any) => [s.employee_id as string, Number(s.base_salary) || 0]));
  const candidateIds = new Set<string>([
    ...Array.from(baseByEmp.keys()),
    ...((dcRes.data ?? []).map((r: any) => r.employee_id as string)),
    ...((compRes.data ?? []).map((r: any) => r.employee_id as string)),
  ]);
  // keep only active, payroll-eligible employees (base role employee, not exempt)
  const { data: profs } = candidateIds.size
    ? await supabase.from("profiles").select("id").in("id", Array.from(candidateIds)).eq("role", "employee").eq("status", "active").eq("payroll_exempt", false)
    : { data: [] as { id: string }[] };
  let eligibleIds = (profs ?? []).map((p: any) => p.id as string);
  if (opts.employeeId) eligibleIds = eligibleIds.filter((id) => id === opts.employeeId); // per-run recompute

  const runs = [];
  for (const employeeId of eligibleIds) {
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

    const base = round2(baseByEmp.get(employeeId) ?? 0);

    // These reads are independent of each other — fetch them concurrently (was a sequential N+1).
    const [wdRes, attRes, leavesRes, compsRes, allLeavesRes, shiftRes, holRes] = await Promise.all([
      supabase.rpc("working_days", { p_employee: employeeId, p_start: opts.from, p_end: opts.to }),
      supabase
        .from("attendance")
        .select("work_date, check_in_time, total_hours, extra_hours, deficit_hours, check_out_time")
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
      // approved leave of ANY type overlapping the period — those days are covered, not "missing"
      supabase
        .from("leave_requests")
        .select("start_date, end_date")
        .eq("employee_id", employeeId)
        .eq("status", "approved")
        .lte("start_date", opts.to)
        .gte("end_date", opts.from),
      supabase.from("shifts").select("days_of_week").eq("employee_id", employeeId).eq("is_active", true).maybeSingle(),
      // audience-aware (0041): only holidays that apply to THIS employee count as non-working days
      supabase.rpc("employee_holidays", { p_employee: employeeId, p_from: opts.from, p_to: opts.to }),
    ]);

    const workingDays = Number(wdRes.data) || 0;

    const att = attRes.data;
    const present = (att ?? []).filter((a) => a.check_out_time).length;
    const totalHours = sum((att ?? []).map((a) => Number(a.total_hours) || 0));
    const totalExtra = sum((att ?? []).map((a) => Number(a.extra_hours) || 0));
    const totalDeficit = sum((att ?? []).map((a) => Number(a.deficit_hours) || 0));

    const leaves = leavesRes.data;
    const unpaidDays = sum((leaves ?? []).map((l) => Number(l.days_count) || 0));

    // MISSING days (owner rule, 2026-07-06): a PAST scheduled working day with no attendance and no
    // approved leave deducts like unpaid leave — with a per-day justification so HR can verify the
    // day, fix the record (attendance or leave), and regenerate to clear it. Today/future never count.
    const attDates = new Set((att ?? []).filter((a) => a.check_in_time).map((a) => String(a.work_date).slice(0, 10)));
    const shiftDows: number[] = shiftRes.data?.days_of_week ?? [1, 2, 3, 4, 5];
    const holidaySet = new Set((holRes.data ?? []).map((h: any) => String(h.holiday_date).slice(0, 10)));
    const leaveRanges = (allLeavesRes.data ?? []).map((l: any) => ({ s: String(l.start_date).slice(0, 10), e: String(l.end_date).slice(0, 10) }));
    const onLeave = (d: string) => leaveRanges.some((r) => d >= r.s && d <= r.e);
    const todayStr = companyToday();
    const missingDates: string[] = [];
    for (const d = new Date(`${opts.from}T00:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      if (ds > opts.to || ds >= todayStr) break;
      if (!shiftDows.includes(d.getUTCDay())) continue;
      if (holidaySet.has(ds) || attDates.has(ds) || onLeave(ds)) continue;
      missingDates.push(ds);
    }
    const missingDays = missingDates.length;

    const dailyRate = workingDays > 0 ? base / workingDays : 0;
    const deductionsUnpaid = round2(unpaidDays * dailyRate);
    const deductionsMissing = round2(missingDays * dailyRate);
    const deductions = round2(deductionsUnpaid + deductionsMissing);

    // dynamic additions = recurring compensation components
    const comps = compsRes.data;
    const additions = (comps ?? []).map((c) => ({ label: c.label, amount: round2(Number(c.amount) || 0), description: c.description }));

    // BD deal commissions: each is a % of the deal's receipts BILLED to this period, or a one-off fixed
    // amount. Receipts are keyed by billing_month (which can differ from when the money physically
    // arrived), so a payment logged in August but billed to July still counts on July's payslip.
    const commissionLines = await computeDealCommissions(supabase, employeeId, opts.from, opts.to);

    const additionsTotal = sum([...additions.map((a) => a.amount), ...commissionLines.map((c) => c.amount)]);

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
      // Preserve admin overrides across a recompute: which (kind|label) lines were DISMISSED, so a
      // deduction the admin struck out stays struck out after regenerating.
      const { data: prev } = await supabase.from("payslip_components").select("kind, label, dismissed").eq("payroll_run_id", run.id);
      const dismissedKeys = new Set((prev ?? []).filter((l: any) => l.dismissed).map((l: any) => `${l.kind}|${l.label}`));
      await supabase.from("payslip_components").delete().eq("payroll_run_id", run.id);
      const lines: Record<string, unknown>[] = [
        { payroll_run_id: run.id, label: "Base salary", amount: base, kind: "base", description: null, is_commission: false },
        ...additions.map((a) => ({ payroll_run_id: run.id, label: a.label, amount: a.amount, kind: "addition", description: a.description, is_commission: false })),
        // deal commissions: kind "addition" (so totals/gross-pay math treats them as additions) but
        // flagged is_commission — the label is BD-safe, the admin breakdown rides in `description`.
        ...commissionLines.map((c) => ({ payroll_run_id: run.id, label: c.label, amount: c.amount, kind: "addition", description: c.description, is_commission: true })),
      ];
      if (deductionsUnpaid > 0)
        lines.push({ payroll_run_id: run.id, label: "Unpaid leave deduction", amount: deductionsUnpaid, kind: "deduction", description: `${unpaidDays} unpaid day(s)`, is_commission: false });
      if (deductionsMissing > 0) {
        const shown = missingDates.slice(0, 10).map((d) => d.slice(5)).join(", ");
        const more = missingDates.length > 10 ? ` +${missingDates.length - 10} more` : "";
        lines.push({
          payroll_run_id: run.id,
          label: "Missing attendance deduction",
          amount: deductionsMissing,
          kind: "deduction",
          description: `Missing record: no attendance and no approved leave on ${missingDays} day(s): ${shown}${more}. Verify/fix the day (attendance or leave) and regenerate to clear.`,
          is_commission: false,
        });
      }
      // re-apply the preserved dismissed flag by (kind|label)
      for (const l of lines) l.dismissed = dismissedKeys.has(`${l.kind}|${l.label}`);
      const { error: linesErr } = await supabase.from("payslip_components").insert(lines);
      if (linesErr) throw new Error(linesErr.message);
      // sync totals with any preserved dismissed lines (a dismissed line is excluded from the run totals)
      if (dismissedKeys.size) await recomputeRun(supabase, run.id);
    }

    runs.push(run);
  }
  return runs;
}

/** Recompute a run's totals from its payslip_components (after manual line edits). Dismissed lines are
 * excluded from every total. Refuses a finalised run. */
export async function recomputeRun(supabase: SupabaseClient, runId: string) {
  await assertNotFinalised(supabase, runId);
  const { data: all } = await supabase.from("payslip_components").select("*").eq("payroll_run_id", runId);
  const lines = (all ?? []).filter((l) => !l.dismissed);
  const base = sum(lines.filter((l) => l.kind === "base").map((l) => Number(l.amount)));
  const additions = sum(lines.filter((l) => l.kind === "addition").map((l) => Number(l.amount)));
  const deductions = sum(lines.filter((l) => l.kind === "deduction").map((l) => Number(l.amount)));
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
  line: { label: string; amount: number; kind: "addition" | "deduction"; description?: string; is_commission?: boolean }
) {
  await assertNotFinalised(supabase, runId);
  await supabase.from("payslip_components").insert({ payroll_run_id: runId, label: line.label, amount: line.amount, kind: line.kind, description: line.description ?? null, is_commission: !!line.is_commission });
  return recomputeRun(supabase, runId);
}
export async function removePayslipLine(supabase: SupabaseClient, lineId: string, runId: string) {
  await assertNotFinalised(supabase, runId);
  await supabase.from("payslip_components").delete().eq("id", lineId);
  return recomputeRun(supabase, runId);
}
/** Dismiss/undismiss a line — kept for the record (shown struck through) but excluded from totals. */
export async function setPayslipLineDismissed(supabase: SupabaseClient, lineId: string, runId: string, dismissed: boolean) {
  await assertNotFinalised(supabase, runId);
  await supabase.from("payslip_components").update({ dismissed }).eq("id", lineId).eq("payroll_run_id", runId);
  return recomputeRun(supabase, runId);
}

/** Add a deal commission line to a run — either a direct amount, or a % of a chosen billing month's
 * receipts for that deal (using the employee's stored rate). Used to catch up a commission missed on a
 * previous month's payslip. Flagged is_commission so the BD-safe payslip aggregates it. */
export async function addDealCommissionToRun(
  supabase: SupabaseClient,
  runId: string,
  input: { deal_id: string; month?: string; amount?: number; label?: string }
) {
  await assertNotFinalised(supabase, runId);
  const { data: run } = await supabase.from("payroll_runs").select("employee_id").eq("id", runId).single();
  if (!run) throw new Error("Run not found");
  const { data: deal } = await supabase.from("deals").select("name, lead:leads(company)").eq("id", input.deal_id).single();
  const company = (deal as any)?.name || (deal as any)?.lead?.company || "Deal";
  const label = input.label?.trim() || `Commission — ${company}`;

  let amount = input.amount != null ? round2(Number(input.amount)) : null;
  let description = `Catch-up commission for ${company} (added manually)`;
  if (amount == null) {
    if (!input.month) throw new Error("Provide an amount or a month");
    const { data: dc } = await supabase.from("deal_commissions").select("rate").eq("employee_id", run.employee_id).eq("deal_id", input.deal_id).eq("is_active", true).maybeSingle();
    const rate = Number(dc?.rate) || 0;
    const monthStart = `${input.month.slice(0, 7)}-01`;
    const { data: pays } = await supabase.from("deal_payments").select("amount").eq("deal_id", input.deal_id).gte("billing_month", monthStart).lte("billing_month", monthStart);
    const received = sum((pays ?? []).map((p: any) => Number(p.amount) || 0));
    amount = round2((rate / 100) * received);
    description = `${rate}% of ${received.toLocaleString("en-PK")} received for ${company} (${input.month.slice(0, 7)}, added manually)`;
  }
  await supabase.from("payslip_components").insert({ payroll_run_id: runId, label, amount, kind: "addition", description, is_commission: true });
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

/** Reopen (unlock) a finalised run back to draft so its lines/amounts can be corrected. A mistaken
 * finalise (or a late correction) shouldn't trap the payslip. Payment status is left untouched. */
export async function reopenPayroll(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("payroll_runs")
    .update({ status: "draft", finalised_at: null })
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
