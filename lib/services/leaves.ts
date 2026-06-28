// Leave business logic (PRD §11 + v2 rules).
// Annual = 8/yr, approval needed, >=21-day notice (admin override). Casual = <=2/month, paid,
// auto-approved. Unpaid = unlimited, recorded, deducted. Quota usage is derived from
// leave_requests (the source of truth) — NOT from per-month counter rows — so it is correct
// across months and across the year.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveType } from "@/lib/types";

export const ANNUAL_TOTAL = 8;
export const CASUAL_MONTHLY_LIMIT = 2;
export const ANNUAL_NOTICE_DAYS = 21;

/** Quotas from company_settings (fall back to the defaults above). */
async function quotas(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("company_settings").select("annual_leave_quota, casual_leave_quota").eq("id", 1).maybeSingle();
  return {
    annual: Number(data?.annual_leave_quota) || ANNUAL_TOTAL,
    casual: Number(data?.casual_leave_quota) || CASUAL_MONTHLY_LIMIT,
  };
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
export async function casualUsedThisMonth(supabase: SupabaseClient, employeeId: string, date = new Date().toISOString().slice(0, 10)) {
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

async function unpaidUsedThisYear(supabase: SupabaseClient, employeeId: string, year = new Date().getFullYear()) {
  const { data } = await supabase
    .from("leave_requests").select("days_count")
    .eq("employee_id", employeeId).eq("type", "unpaid").eq("status", "approved")
    .gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`);
  return (data ?? []).reduce((s, r) => s + Number(r.days_count), 0);
}

/** Derived leave summary for display. */
export async function leaveSummary(supabase: SupabaseClient, employeeId: string) {
  const [annualUsed, casualUsed, unpaidUsed, q] = await Promise.all([
    annualUsedThisYear(supabase, employeeId),
    casualUsedThisMonth(supabase, employeeId),
    unpaidUsedThisYear(supabase, employeeId),
    quotas(supabase),
  ]);
  return {
    annualTotal: q.annual,
    annualUsed,
    annualRemaining: Math.max(q.annual - annualUsed, 0),
    casualLimit: q.casual,
    casualUsed,
    casualRemaining: Math.max(q.casual - casualUsed, 0),
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
}

export async function requestLeave(
  supabase: SupabaseClient,
  employeeId: string,
  input: RequestLeaveInput,
  opts: { allowShortNotice?: boolean } = {}
) {
  const daysCount = await workingDays(supabase, employeeId, input.start_date, input.end_date);
  const q = await quotas(supabase);

  if (await hasOverlap(supabase, employeeId, input.start_date, input.end_date))
    throw new Error("This range overlaps an existing leave request.");

  const today = new Date();
  const noticeCutoff = new Date(today.getTime() + ANNUAL_NOTICE_DAYS * 86400000);
  const lateNotice = input.type === "annual" && new Date(input.start_date) < noticeCutoff;
  if (lateNotice && !opts.allowShortNotice) {
    throw new Error(`Annual leave must be requested at least ${ANNUAL_NOTICE_DAYS} days in advance (admin override required).`);
  }

  if (input.type === "casual") {
    const used = await casualUsedThisMonth(supabase, employeeId, input.start_date);
    if (used + daysCount > q.casual)
      throw new Error(`Casual leave is limited to ${q.casual} days per month (already used ${used}).`);
    const { data } = await supabase.from("leave_requests")
      .insert({ ...base(employeeId, input, daysCount), status: "approved", approved_at: new Date().toISOString() })
      .select().single();
    return { requests: [data], overflowOffered: false, lateNotice: false };
  }

  if (input.type === "unpaid") {
    const { data } = await supabase.from("leave_requests")
      .insert({ ...base(employeeId, input, daysCount), status: "approved", approved_at: new Date().toISOString() })
      .select().single();
    return { requests: [data], overflowOffered: false, lateNotice: false };
  }

  // annual — quota derived from approved annual leaves this year
  const used = await annualUsedThisYear(supabase, employeeId);
  const remaining = Math.max(q.annual - used, 0);
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
