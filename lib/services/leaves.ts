// Leave business logic (PRD §11). Annual = 8/yr (approval needed), Casual = 1/mo (auto),
// Unpaid = unlimited (recorded, deducted). Non-annual auto-approve; overflow → unpaid.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaveType } from "@/lib/types";

async function workingDays(supabase: SupabaseClient, employeeId: string, start: string, end: string) {
  const { data, error } = await supabase.rpc("working_days", {
    p_employee: employeeId,
    p_start: start,
    p_end: end,
  });
  if (error) throw new Error(error.message);
  // fall back to inclusive day count if shift schedule yields 0
  const days = Number(data) || 0;
  if (days > 0) return days;
  const d = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  return Math.max(d, 1);
}

async function currentBalance(supabase: SupabaseClient, employeeId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { data } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("year", year)
    .eq("casual_month", month)
    .maybeSingle();
  return { balance: data, year, month };
}

export interface RequestLeaveInput {
  type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string;
}

/**
 * Submit a leave request. Returns the created request(s) plus any overflow info.
 * - annual over remaining → annual (pending) for the remaining + unpaid (approved) for the overflow
 * - casual → auto-approved, casual_used incremented
 * - unpaid → approved, flagged for deduction, unpaid_used incremented
 */
/** Sum of approved casual leave days in the calendar month of `date`. */
async function casualDaysInMonth(supabase: SupabaseClient, employeeId: string, date: string) {
  const d = new Date(date);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("leave_requests")
    .select("days_count")
    .eq("employee_id", employeeId)
    .eq("type", "casual")
    .eq("status", "approved")
    .gte("start_date", monthStart)
    .lte("start_date", monthEnd);
  return (data ?? []).reduce((s, r) => s + Number(r.days_count), 0);
}

export const CASUAL_MONTHLY_LIMIT = 2;
export const ANNUAL_NOTICE_DAYS = 21;

export async function requestLeave(
  supabase: SupabaseClient,
  employeeId: string,
  input: RequestLeaveInput,
  opts: { allowShortNotice?: boolean } = {}
) {
  const daysCount = await workingDays(supabase, employeeId, input.start_date, input.end_date);
  const { balance } = await currentBalance(supabase, employeeId);

  // advance-notice rule for annual (§11.3 → 21 days). Admins may override.
  const today = new Date();
  const noticeCutoff = new Date(today.getTime() + ANNUAL_NOTICE_DAYS * 86400000);
  const lateNotice = input.type === "annual" && new Date(input.start_date) < noticeCutoff;
  if (lateNotice && !opts.allowShortNotice) {
    throw new Error(
      `Annual leave must be requested at least ${ANNUAL_NOTICE_DAYS} days in advance (admin override required).`
    );
  }

  if (input.type === "casual") {
    // casual is capped at 2 days per calendar month
    const used = await casualDaysInMonth(supabase, employeeId, input.start_date);
    if (used + daysCount > CASUAL_MONTHLY_LIMIT) {
      throw new Error(
        `Casual leave is limited to ${CASUAL_MONTHLY_LIMIT} days per month (already used ${used}).`
      );
    }
    const { data } = await supabase
      .from("leave_requests")
      .insert({ ...base(employeeId, input, daysCount), status: "approved", approved_at: new Date().toISOString() })
      .select()
      .single();
    if (balance) {
      await supabase
        .from("leave_balances")
        .update({ casual_used: (balance.casual_used ?? 0) + daysCount })
        .eq("id", balance.id);
    }
    return { requests: [data], overflowOffered: false, lateNotice: false };
  }

  if (input.type === "unpaid") {
    const { data } = await supabase
      .from("leave_requests")
      .insert({ ...base(employeeId, input, daysCount), status: "approved", approved_at: new Date().toISOString() })
      .select()
      .single();
    if (balance) {
      await supabase
        .from("leave_balances")
        .update({ unpaid_used: (balance.unpaid_used ?? 0) + daysCount })
        .eq("id", balance.id);
    }
    return { requests: [data], overflowOffered: false, lateNotice };
  }

  // annual
  const remaining = balance ? balance.annual_total - balance.annual_used : 8;
  if (daysCount > remaining) {
    const annualPart = Math.max(remaining, 0);
    const unpaidPart = daysCount - annualPart;
    const created = [];
    if (annualPart > 0) {
      const { data } = await supabase
        .from("leave_requests")
        .insert({ ...base(employeeId, input, annualPart), type: "annual", status: "pending" })
        .select()
        .single();
      created.push(data);
    }
    const { data: unpaid } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: employeeId,
        type: "unpaid",
        start_date: input.start_date,
        end_date: input.end_date,
        days_count: unpaidPart,
        reason: (input.reason ?? "") + " (overflow beyond annual quota)",
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();
    created.push(unpaid);
    return { requests: created, overflowOffered: true, annualPart, unpaidPart, remaining, lateNotice };
  }

  const { data } = await supabase
    .from("leave_requests")
    .insert({ ...base(employeeId, input, daysCount), type: "annual", status: "pending" })
    .select()
    .single();
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

/** Approve/reject a leave. Approving annual increments annual_used. */
export async function decideLeave(
  supabase: SupabaseClient,
  leaveId: string,
  actorId: string,
  decision: { status: "approved" | "rejected"; note?: string }
) {
  const { data: req, error } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", leaveId)
    .single();
  if (error || !req) throw new Error("Leave request not found");

  const { data: updated, error: e2 } = await supabase
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
  if (e2) throw new Error(e2.message);

  if (decision.status === "approved" && req.type === "annual") {
    const year = new Date(req.start_date).getFullYear();
    const month = new Date().getMonth() + 1;
    const { data: bal } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("employee_id", req.employee_id)
      .eq("year", year)
      .eq("casual_month", month)
      .maybeSingle();
    if (bal) {
      await supabase
        .from("leave_balances")
        .update({ annual_used: (bal.annual_used ?? 0) + req.days_count })
        .eq("id", bal.id);
    }
  }

  await supabase.from("audit_log").insert({
    actor_id: actorId,
    action: `leave.${decision.status}`,
    entity: "leave_requests",
    entity_id: leaveId,
    after: updated,
  });

  return { request: updated };
}
