import { Clock, TrendingDown, CalendarCheck, CalendarX, Plane } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { companyToday, resolveRange, RANGE_LABELS, type RangeKey } from "@/lib/time";
import { todayAttendance } from "@/lib/services/attendance";
import { buildEmployeeReport } from "@/lib/services/reports";
import { CheckWidget } from "@/components/attendance/check-widget";
import { SummaryRange } from "@/components/attendance/summary-range";
import { EditAttendance } from "@/components/attendance/edit-attendance";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/utils";
import { workLogPreview } from "@/lib/worklog";

const time = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const today = companyToday();
  const todayData = await todayAttendance(supabase, profile.id);
  const admin = isAdmin(profile.role);

  // The attendance summary + the deficit/extra column are shown to employees only when the admin flag
  // is on (default true); admins always see them.
  const { data: settings } = await supabase
    .from("company_settings").select("show_employee_attendance_summary").eq("id", 1).maybeSingle();
  const showSummary = admin || (settings?.show_employee_attendance_summary ?? true);

  // Summary date range: default = this month (1st → today). BD: This month / Last 3 months; admin: any.
  const { from, to, range } = resolveRange((searchParams.range as RangeKey) ?? "month", searchParams.from, searchParams.to);
  const summary = showSummary ? await buildEmployeeReport(supabase, profile.id, from, to) : null;

  const { data: history } = await supabase
    .from("attendance").select("*").eq("employee_id", profile.id)
    .order("work_date", { ascending: false }).limit(30);

  return (
    <div className="space-y-6">
      <CheckWidget today={todayData as any} />

      {summary && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>Summary · {RANGE_LABELS[range]}</CardTitle>
            <SummaryRange range={range} from={from} to={to} allowCustom={admin} />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <StatCard label="Total hours" value={formatHours(summary.totalHours)} icon={Clock} />
              <StatCard label="Deficit (gross)" value={formatHours(summary.totalDeficitHours)} icon={TrendingDown} tone="danger" />
              <StatCard label="Extra (gross)" value={formatHours(summary.totalExtraHours)} icon={Clock} tone="success" />
              <StatCard label="Days worked" value={`${summary.daysWorked}/${summary.workingDays}`} icon={CalendarCheck} tone="brand" />
              <StatCard label="Leaves" value={summary.leaveDays} icon={Plane} tone="neutral" />
              <StatCard label="Missing" value={summary.missingDays} icon={CalendarX} tone="warning" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Attendance history</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>In</TH><TH>Out</TH><TH>Hours</TH>{showSummary && <TH>Deficit/Extra</TH>}<TH>Log</TH><TH></TH></TR>
            </THead>
            <TBody>
              {(history ?? []).map((r) => {
                const open = r.check_in_time && !r.check_out_time;
                return (
                  <TR key={r.id}>
                    <TD className="tabular">{r.work_date}{r.is_edited && <Badge tone="neutral" className="ml-2">edited</Badge>}</TD>
                    <TD className="tabular">{time(r.check_in_time)}</TD>
                    <TD className="tabular">{open ? <Badge tone="danger">open</Badge> : time(r.check_out_time)}</TD>
                    <TD className="tabular">{formatHours(r.total_hours)}</TD>
                    {showSummary && (
                      <TD>
                        {Number(r.deficit_hours) > 0 && <Badge tone="danger">-{formatHours(r.deficit_hours)}</Badge>}
                        {Number(r.extra_hours) > 0 && <Badge tone="success">+{formatHours(r.extra_hours)}</Badge>}
                      </TD>
                    )}
                    <TD className="max-w-[200px] truncate text-text-secondary">{workLogPreview(r.work_log) || "—"}</TD>
                    <TD>{r.work_date === today && r.check_in_time && (
                      <EditAttendance
                        attendanceId={r.id}
                        workDate={r.work_date}
                        checkInTime={r.check_in_time}
                        checkOutTime={r.check_out_time}
                        mode="employee"
                      />
                    )}</TD>
                  </TR>
                );
              })}
              {(history ?? []).length === 0 && (
                <TR><TD colSpan={showSummary ? 7 : 6} className="py-6 text-center text-text-secondary">No records yet.</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
