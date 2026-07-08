// Leave business logic (PRD §11 + v2 rules).
// ALL leave requests need admin approval — they're created `pending` and an admin approves/rejects
// (owner rule, 2026-07-05; casual/unpaid used to auto-approve). Annual = 8/yr, >=21-day notice (admin
// override); Casual = <=1/month, one request/month; Unpaid = unlimited, deducted. Quota usage is
// derived from APPROVED leave_requests (the source of truth) — so counts reflect approved leave only.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveType } from "@/lib/types";
import { companyToday } from "@/lib/time";

export const ANNUAL_TOTAL = 8;
export const CASUAL_MONTHLY_LIMIT = 1; // golden rule: casual 1/mo (no carry)
export const ANNUAL_NOTICE_DAYS = 21;
export const BACKDATE_DAYS = 7; // an employee may self-file leave up to 7 days back (older → admin adds)

/** A configured quota, honouring an explicit 0; fall back to `dflt` only when unset/non-numeric. */
function quota(value: unknown, dflt: number) {
  if (value == null) return dflt; // null/undefined (no row / nullable col) → unset; Number(null)=0 would leak
  const n = Number(value);
  return Number.isFinite(n) ? n : dflt; // `??`/finite-check, NOT `||` — an intentional 0 must survive
}

/** Quotas from company_settings (fall back to the defaults above). */
async function quotas(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("company_settings").select("annual_leave_quota, casual_leave_quota").eq("id", 1).maybeSingle();
  return {
    annual: quota(data?.annual_leave_quota, ANNUAL_TOTAL),
    casual: quota(data?.casual_leave_quota, CASUAL_MONTHLY_LIMIT),
  };
}

export const PROBATION_MONTHS = 3;

/** Employee leave context. */
async function leaveCtx(supabase: SupabaseClient, employeeId: string) {
  const { data } = await supabase
    .from("profiles").select("contract_type, joining_date, is_deal_developer").eq("id", employeeId).maybeSingle();
  return {
    contract_type: data?.contract_type ?? "permanent",
    joining_date: data?.joining_date ?? null,
    is_deal_developer: !!data?.is_deal_developer,
  };
}

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Probation end date (joining + PROBATION_MONTHS) or null if no joining date. */
export function probationEnd(joining: string | null): Date | null {
  return joining ? addMonths(new Date(joining), PROBATION_MONTHS) : null;
}

/** Annual leaves accrued so far this calendar year: 1/month (from Jan 1 or probation end,
 *  whichever is later), capped at the yearly quota. Probation → 0. */
function annualAccrued(ctx: { contract_type: string; joining_date: string | null }, cap: number, now = new Date()) {
  if (ctx.contract_type === "probation") return 0;
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const pEnd = probationEnd(ctx.joining_date);
  const start = pEnd && pEnd > jan1 ? pEnd : jan1;
  if (start > now) return 0;
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
  return Math.max(0, Math.min(months, cap));
}

/** Approved casual days taken during the current probation window (since joining). */
async function casualUsedInProbation(supabase: SupabaseClient, employeeId: string, joining: string | null) {
  if (!joining) return 0;
  const { data } = await supabase
    .from("leave_requests").select("days_count")
    .eq("employee_id", employeeId).eq("type", "casual").eq("status", "approved")
    .gte("start_date", joining);
  return (data ?? []).reduce((s, r) => s + Number(r.days_count), 0);
}

/** Any non-rejected/cancelled leave overlapping [start,end] for this employee. */
async function hasOverlap(supabase: SupabaseClient, employeeId: string, start: string, end: string) {
  const { data } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("employee_id", employeeId)
    .in("status", ["pending", "approved"])
    .lte("start_date", end)
    .gte("end_date", start)
    .limit(1);
  return (data ?? []).length > 0;
}

async function workingDays(supabase: SupabaseClient, employeeId: string, start: string, end: string) {
  const { data, error } = await supabase.rpc("working_days", { p_employee: employeeId, p_start: start, p_end: end });
  if (error) throw new Error(error.message);
  const days = Number(data) || 0;
  if (days > 0) return days;
  const d = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  return Math.max(d, 1);
}

/** Approved annual days used in `year`. */
export async function annualUsedThisYear(supabase: SupabaseClient, employeeId: string, year = new Date().getFullYear()) {
  const { data } = await supabase
    .from("leave_requests").select("days_count")
    .eq("employee_id", employeeId).eq("type", "annual").eq("status", "approved")
    .gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`);
  return (data ?? []).reduce((s, r) => s + Number(r.days_count), 0);
}

/** Approved casual days used in the calendar month of `date`. */
export async function casualUsedThisMonth(supabase: SupabaseClient, employeeId: string, date = companyToday()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}-${pad(m + 1)}-01`;
  const end = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`; // actual last day
  const { data } = await supabase
    .from("leave_requests").select("days_count")
    .eq("employee_id", employeeId).eq("type", "casual").eq("status", "approved")
    .gte("start_date", start).lte("start_date", end);
  return (data ?? []).reduce((s, r) => s + Number(r.days_count), 0);
}

/** Count casual leave REQUESTS (pending OR approved) in the calendar month of `date` — used to enforce
 *  "one casual request per month" (blocks a 2nd even before the first is decided). */
export async function casualRequestsThisMonth(supabase: SupabaseClient, employeeId: string, date = companyToday()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}-${pad(m + 1)}-01`;
  const end = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
  const { count } = await supabase
    .from("leave_requests").select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId).eq("type", "casual").in("status", ["pending", "approved"])
    .gte("start_date", start).lte("start_date", end);
  return count ?? 0;
}

async function unpaidUsedThisYear(supabase: SupabaseClient, employeeId: string, year = new Date().getFullYear()) {
  const { data } = await supabase
    .from("leave_requests").select("days_count")
    .eq("employee_id", employeeId).eq("type", "unpaid").eq("status", "approved")
    .gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`);
  return (data ?? []).reduce((s, r) => s + Number(r.days_count), 0);
}

/** Derived leave summary for display (accrual + probation aware). */
export async function leaveSummary(supabase: SupabaseClient, employeeId: string) {
  const [annualUsed, casualMonth, unpaidUsed, q, ctx] = await Promise.all([
    annualUsedThisYear(supabase, employeeId),
    casualUsedThisMonth(supabase, employeeId),
    unpaidUsedThisYear(supabase, employeeId),
    quotas(supabase),
    leaveCtx(supabase, employeeId),
  ]);
  const probation = ctx.contract_type === "probation";
  const accrued = annualAccrued(ctx, q.annual);

  // casual: probation → 1 per probation window; permanent → q.casual per month (no carry)
  const casualUsed = probation ? await casualUsedInProbation(supabase, employeeId, ctx.joining_date) : casualMonth;
  const casualLimit = probation ? 1 : q.casual;

  return {
    probation,
    probationEnd: probationEnd(ctx.joining_date)?.toISOString().slice(0, 10) ?? null,
    annualTotal: q.annual,
    annualAccrued: accrued,
    annualUsed,
    annualRemaining: Math.max(accrued - annualUsed, 0),
    casualLimit,
    casualUsed,
    casualRemaining: Math.max(casualLimit - casualUsed, 0),
    unpaidUsed,
  };
}

/** Split [start,end] into the first `firstCount` working days (Mon–Fri) and the remainder. */
function splitWorkingDates(start: string, end: string, firstCount: number) {
  const dates: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  const first = dates.slice(0, firstCount);
  const rest = dates.slice(firstCount);
  const range = (arr: string[]) => (arr.length ? { start: arr[0], end: arr[arr.length - 1], days: arr.length } : null);
  return { first: range(first), rest: range(rest) };
}

export interface RequestLeaveInput {
  type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string;
  half_day?: boolean;
  half_period?: "first" | "second" | null;
}

/** Casual DAYS requested this calendar month (pending + approved), so multiple half-days count toward the
 *  monthly cap before any is approved. Optionally excludes a request id (unused today). */
export async function casualDaysThisMonth(supabase: SupabaseClient, employeeId: string, date = companyToday()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}-${pad(m + 1)}-01`;
  const end = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
  const { data } = await supabase
    .from("leave_requests").select("days_count")
    .eq("employee_id", employeeId).eq("type", "casual").in("status", ["pending", "approved"])
    .gte("start_date", start).lte("start_date", end);
  return (data ?? []).reduce((s, r) => s + Number(r.days_count), 0);
}

export async function requestLeave(
  supabase: SupabaseClient,
  employeeId: string,
  input: RequestLeaveInput,
  opts: { allowShortNotice?: boolean; allowUnpaidFallback?: boolean } = {}
) {
  // Half-day: a single date worth 0.5 (casual or the unpaid fallback only; annual stays whole-day).
  if (input.half_day) {
    if (input.type === "annual") throw new Error("Annual leave can't be taken as a half day — use casual or unpaid.");
    input = { ...input, end_date: input.start_date };
  }
  // Backdating: allow filling a missed day up to BACKDATE_DAYS back; older dates need an admin (AddLeave).
  const backdateFloor = companyToday(new Date(new Date(`${companyToday()}T00:00:00+05:00`).getTime() - BACKDATE_DAYS * 86_400_000));
  if (input.start_date < backdateFloor)
    throw new Error(`You can backdate a leave up to ${BACKDATE_DAYS} days. For an older date, ask an admin to add it.`);

  const daysCount = input.half_day ? 0.5 : await workingDays(supabase, employeeId, input.start_date, input.end_date);
  const q = await quotas(supabase);
  const ctx = await leaveCtx(supabase, employeeId);
  const probation = ctx.contract_type === "probation";

  if (await hasOverlap(supabase, employeeId, input.start_date, input.end_date))
    throw new Error("This range overlaps an existing leave request.");

  // Deal-assigned developers: their leave is governed by the client company, so OUR quotas/notice/caps
  // don't apply — the request is recorded for our log and goes to admin as pending (no auto-approve).
  if (ctx.is_deal_developer) {
    const { data } = await supabase.from("leave_requests")
      .insert({ ...base(employeeId, input, daysCount), status: "pending" })
      .select().single();
    return { requests: [data], overflowOffered: false, lateNotice: false };
  }

  // Notice is DATE-based (Asia/Karachi): starting exactly NOTICE_DAYS from today is acceptable.
  // (Instant-based comparison made "exactly 21 days ahead" fail depending on the time of day.)
  const noticeCutoffDate = companyToday(new Date(new Date(`${companyToday()}T00:00:00+05:00`).getTime() + ANNUAL_NOTICE_DAYS * 86400000));
  const lateNotice = input.type === "annual" && input.start_date < noticeCutoffDate;
  if (lateNotice && !opts.allowShortNotice) {
    throw new Error(`Annual leave must be requested at least ${ANNUAL_NOTICE_DAYS} days in advance (admin override required).`);
  }

  if (probation && input.type === "annual")
    throw new Error("Employees on probation don't have annual leave — please file it as unpaid.");

  if (input.type === "casual") {
    // Cap: probation = 1 for the whole probation window; permanent = q.casual per month. Usage is counted
    // in DAYS incl. pending, so two half-days on different days both count toward the 1-day allowance.
    const cap = probation ? 1 : q.casual;
    const used = probation
      ? await casualUsedInProbation(supabase, employeeId, ctx.joining_date)
      : await casualDaysThisMonth(supabase, employeeId, input.start_date);
    const remainingCasual = Math.max(cap - used, 0);

    if (daysCount <= remainingCasual) {
      // fits within the casual allowance → a single casual request, pending admin approval.
      const { data } = await supabase.from("leave_requests")
        .insert({ ...base(employeeId, input, daysCount), status: "pending" })
        .select().single();
      return { requests: [data], overflowOffered: false, needsUnpaidConfirm: false, lateNotice: false };
    }

    // Exceeds the casual allowance → the shortfall must be UNPAID. For a half-day the fitting case is
    // handled above, so casualPart is 0 (the whole half is unpaid). For a full/multi-day range, whole
    // casual days are used first, the remainder unpaid.
    const casualPart = input.half_day ? 0 : Math.min(Math.floor(remainingCasual), daysCount);
    const unpaidPart = daysCount - casualPart;
    if (!opts.allowUnpaidFallback) {
      // No insert yet — the UI shows a confirm modal ("no casual left → unpaid"), then resubmits with
      // allowUnpaidFallback so the employee explicitly opted into the unpaid portion.
      return { requests: [], needsUnpaidConfirm: true, casualPart, unpaidPart, remainingCasual, overflowOffered: false, lateNotice: false };
    }
    const created: unknown[] = [];
    if (input.half_day) {
      const { data } = await supabase.from("leave_requests")
        .insert({ ...base(employeeId, { ...input, type: "unpaid" }, 0.5), reason: (input.reason ?? "") + " (no casual left → unpaid)", status: "pending" })
        .select().single();
      created.push(data);
    } else {
      const split = splitWorkingDates(input.start_date, input.end_date, casualPart);
      if (split.first) {
        const { data } = await supabase.from("leave_requests")
          .insert({ employee_id: employeeId, type: "casual", start_date: split.first.start, end_date: split.first.end, days_count: split.first.days, reason: input.reason ?? null, half_day: false, half_period: null, status: "pending" })
          .select().single();
        created.push(data);
      }
      if (split.rest) {
        const { data } = await supabase.from("leave_requests")
          .insert({ employee_id: employeeId, type: "unpaid", start_date: split.rest.start, end_date: split.rest.end, days_count: split.rest.days, reason: (input.reason ?? "") + " (no casual left → unpaid)", half_day: false, half_period: null, status: "pending" })
          .select().single();
        created.push(data);
      }
    }
    return { requests: created, overflowOffered: false, needsUnpaidConfirm: false, unpaidFallback: true, casualPart, unpaidPart, lateNotice: false };
  }

  if (input.type === "unpaid") {
    const { data } = await supabase.from("leave_requests")
      .insert({ ...base(employeeId, input, daysCount), status: "pending" })
      .select().single();
    return { requests: [data], overflowOffered: false, lateNotice: false };
  }

  // annual — available = accrued-to-date (1/month, carried within year) minus used
  const used = await annualUsedThisYear(supabase, employeeId);
  const remaining = Math.max(annualAccrued(ctx, q.annual) - used, 0);
  if (daysCount > remaining) {
    const annualPart = remaining;
    const unpaidPart = daysCount - annualPart;
    const split = splitWorkingDates(input.start_date, input.end_date, annualPart);
    const created = [];
    if (split.first) {
      const { data } = await supabase.from("leave_requests")
        .insert({ employee_id: employeeId, type: "annual", start_date: split.first.start, end_date: split.first.end, days_count: split.first.days, reason: input.reason ?? null, status: "pending" })
        .select().single();
      created.push(data);
    }
    if (split.rest) {
      // overflow is also pending so admin decides it alongside the annual part
      const { data } = await supabase.from("leave_requests")
        .insert({ employee_id: employeeId, type: "unpaid", start_date: split.rest.start, end_date: split.rest.end, days_count: split.rest.days, reason: (input.reason ?? "") + " (overflow beyond annual quota)", status: "pending" })
        .select().single();
      created.push(data);
    }
    return { requests: created, overflowOffered: true, annualPart, unpaidPart, remaining, lateNotice };
  }

  const { data } = await supabase.from("leave_requests")
    .insert({ ...base(employeeId, input, daysCount), type: "annual", status: "pending" })
    .select().single();
  return { requests: [data], overflowOffered: false, lateNotice };
}

function base(employeeId: string, input: RequestLeaveInput, daysCount: number) {
  return {
    employee_id: employeeId,
    type: input.type,
    start_date: input.start_date,
    end_date: input.end_date,
    days_count: daysCount,
    reason: input.reason ?? null,
    half_day: !!input.half_day,
    half_period: input.half_day ? (input.half_period ?? "first") : null,
  };
}

/** Approve/reject a leave. Annual quota is derived from approved leaves, so no counter to update. */
export async function decideLeave(
  supabase: SupabaseClient,
  leaveId: string,
  actorId: string,
  decision: { status: "approved" | "rejected"; note?: string }
) {
  const { data: updated, error } = await supabase
    .from("leave_requests")
    .update({
      status: decision.status,
      approved_by: actorId,
      approved_at: new Date().toISOString(),
      decision_note: decision.note ?? null,
    })
    .eq("id", leaveId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  // audit captured by the record_audit() DB trigger on leave_requests.
  return { request: updated };
}
