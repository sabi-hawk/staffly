import { Clock, TrendingDown, CalendarCheck, CalendarX, Plane } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveRange, type RangeKey } from "@/lib/time";
import { buildEmployeeReport } from "@/lib/services/reports";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { AttendanceControls } from "@/components/attendance/attendance-controls";
import { EditAttendance } from "@/components/attendance/edit-attendance";
import { formatHours, formatCode } from "@/lib/utils";

const time = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: { employeeId?: string; range?: string; from?: string; to?: string; page?: string; pageSize?: string };
}) {
  const supabase = createClient();
  const employeeId = searchParams.employeeId || "";
  const { from, to, range } = resolveRange(searchParams.range as RangeKey, searchParams.from, searchParams.to);
  const { page, pageSize, from: offset } = parsePaging(searchParams);

  const { data: employees } = await supabase
    .from("profiles").select("id, full_name, employee_code").eq("role", "employee").order("full_name");

  const summary = employeeId ? await buildEmployeeReport(supabase, employeeId, from, to) : null;

  let query = supabase
    .from("attendance")
    .select("*, profiles!attendance_employee_id_fkey(full_name, employee_code)", { count: "exact" })
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data: rows, count } = await query;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Attendance</CardTitle></CardHeader>
        <CardContent>
          <AttendanceControls
            employees={employees ?? []}
            employeeId={employeeId}
            range={range}
            from={from}
            to={to}
          />
        </CardContent>
      </Card>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label="Total hours" value={formatHours(summary.totalHours)} icon={Clock} />
          <StatCard label="Deficit (gross)" value={formatHours(summary.totalDeficitHours)} icon={TrendingDown} tone="danger" />
          <StatCard label="Extra (gross)" value={formatHours(summary.totalExtraHours)} icon={Clock} tone="success" />
          <StatCard label="Days worked" value={`${summary.daysWorked}/${summary.workingDays}`} icon={CalendarCheck} tone="brand" />
          <StatCard label="Leaves" value={summary.leaveDays} icon={Plane} tone="neutral" />
          <StatCard label="Missing" value={summary.missingDays} icon={CalendarX} tone="warning" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{employeeId ? "Records" : "All attendance"} · {from} → {to}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Code</TH><TH>Employee</TH><TH>Date</TH><TH>In</TH><TH>Out</TH>
                <TH>Hours</TH><TH>Deficit/Extra</TH><TH>Edit</TH>
              </TR>
            </THead>
            <TBody>
              {(rows ?? []).map((r: any) => {
                const open = r.check_in_time && !r.check_out_time;
                return (
                  <TR key={r.id}>
                    <TD className="tabular text-text-secondary">{formatCode(r.profiles?.employee_code)}</TD>
                    <TD>{r.profiles?.full_name}</TD>
                    <TD className="tabular">{r.work_date}{r.is_edited && <Badge tone="neutral" className="ml-2">edited</Badge>}</TD>
                    <TD className="tabular">{time(r.check_in_time)}</TD>
                    <TD className="tabular">{open ? <Badge tone="danger">open</Badge> : time(r.check_out_time)}</TD>
                    <TD className="tabular">{formatHours(r.total_hours)}</TD>
                    <TD>
                      {Number(r.deficit_hours) > 0 && <Badge tone="danger">-{formatHours(r.deficit_hours)}</Badge>}
                      {Number(r.extra_hours) > 0 && <Badge tone="success">+{formatHours(r.extra_hours)}</Badge>}
                    </TD>
                    <TD>
                      <EditAttendance
                        attendanceId={r.id}
                        workDate={r.work_date}
                        checkInTime={r.check_in_time}
                        checkOutTime={r.check_out_time}
                        mode="admin"
                      />
                    </TD>
                  </TR>
                );
              })}
              {(rows ?? []).length === 0 && (
                <TR><TD className="py-6 text-center text-text-secondary">No attendance in this range.</TD></TR>
              )}
            </TBody>
          </Table>
          <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
        </CardContent>
      </Card>
    </div>
  );
}
