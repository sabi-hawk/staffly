// Date-range employee report (PRD §10.3). Gross totals honour the non-netting rule.
import type { SupabaseClient } from "@supabase/supabase-js";

export async function buildEmployeeReport(
  supabase: SupabaseClient,
  employeeId: string,
  from: string,
  to: string
) {
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
  const daysWorked = att.filter((a) => a.check_out_time).length;
  const totalHours = round(att.reduce((s, a) => s + (Number(a.total_hours) || 0), 0));
  const totalExtra = round(att.reduce((s, a) => s + (Number(a.extra_hours) || 0), 0));
  const totalDeficit = round(att.reduce((s, a) => s + (Number(a.deficit_hours) || 0), 0));

  const { data: leaves } = await supabase
    .from("leave_requests")
    .select("type, days_count, status, start_date, end_date")
    .eq("employee_id", employeeId)
    .eq("status", "approved")
    .gte("start_date", from)
    .lte("end_date", to);

  const leavesByType: Record<string, number> = {};
  for (const l of leaves ?? []) leavesByType[l.type] = (leavesByType[l.type] ?? 0) + Number(l.days_count);

  return {
    employeeId,
    from,
    to,
    workingDays,
    daysWorked,
    absentDays: Math.max(workingDays - daysWorked, 0),
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
