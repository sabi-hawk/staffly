// Date-range employee report / summary (PRD §10.3 + v2 attendance analytics).
// Gross totals honour the non-netting rule. Shared by Reports + Attendance summary cards.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface EmployeeReport {
  employeeId: string;
  from: string;
  to: string;
  workingDays: number;
  daysPresent: number;
  daysWorked: number; // checked out
  openDays: number;
  leaveDays: number;
  missingDays: number;
  totalHours: number;
  totalExtraHours: number;
  totalDeficitHours: number;
  leavesByType: Record<string, number>;
  daily: any[];
}

export async function buildEmployeeReport(
  supabase: SupabaseClient,
  employeeId: string,
  from: string,
  to: string
): Promise<EmployeeReport> {
  const workingDays =
    Number(
      (await supabase.rpc("working_days", { p_employee: employeeId, p_start: from, p_end: to })).data
    ) || 0;

  const { data: rows } = await supabase
    .from("attendance")
    .select("work_date, status, total_hours, deficit_hours, extra_hours, check_in_time, check_out_time, work_log")
    .eq("employee_id", employeeId)
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date");

  const att = rows ?? [];
  const daysPresent = att.filter((a) => a.check_in_time).length;
  const daysWorked = att.filter((a) => a.check_out_time).length;
  const openDays = att.filter((a) => a.check_in_time && !a.check_out_time).length;
  const totalHours = round(att.reduce((s, a) => s + (Number(a.total_hours) || 0), 0));
  const totalExtra = round(att.reduce((s, a) => s + (Number(a.extra_hours) || 0), 0));
  const totalDeficit = round(att.reduce((s, a) => s + (Number(a.deficit_hours) || 0), 0));

  const { data: leaves } = await supabase
    .from("leave_requests")
    .select("type, days_count, status, start_date, end_date")
    .eq("employee_id", employeeId)
    .eq("status", "approved")
    .lte("start_date", to)
    .gte("end_date", from);

  const leavesByType: Record<string, number> = {};
  let leaveDays = 0;
  for (const l of leaves ?? []) {
    leavesByType[l.type] = (leavesByType[l.type] ?? 0) + Number(l.days_count);
    leaveDays += Number(l.days_count);
  }

  // "missing" = scheduled working days with neither attendance nor approved leave
  const missingDays = Math.max(workingDays - daysPresent - leaveDays, 0);

  return {
    employeeId,
    from,
    to,
    workingDays,
    daysPresent,
    daysWorked,
    openDays,
    leaveDays,
    missingDays,
    totalHours,
    totalExtraHours: totalExtra, // gross
    totalDeficitHours: totalDeficit, // gross
    leavesByType,
    daily: att,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
