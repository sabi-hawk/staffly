import { Clock, TrendingDown, CalendarCheck, CalendarX, Plane, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveRange, companyToday, type RangeKey } from "@/lib/time";
import { buildEmployeeReport } from "@/lib/services/reports";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { AttendanceControls } from "@/components/attendance/attendance-controls";
import { EditAttendance } from "@/components/attendance/edit-attendance";
import { CorrectionActions } from "@/components/admin/correction-actions";
import { FilterShell } from "@/components/crm/filter-shell";
import { DaySummary, type JobLine } from "@/components/attendance/day-summary";
import { huntedCountsForRange } from "@/lib/services/job-hunts";
import { formatHours, formatCode } from "@/lib/utils";

const strip = (html: string | null | undefined) => (html ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();

const time = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—";
const kindLabel: Record<string, string> = { missing: "Missing day", wrong_time: "Wrong times", forgot_checkout: "Forgot checkout" };

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

  // Who checked in today but hasn't written their task summary yet (admin visibility).
  const today = companyToday();
  const { data: missingToday } = await supabase
    .from("attendance")
    .select("employee_id, profiles!attendance_employee_id_fkey(full_name)")
    .eq("work_date", today)
    .not("check_in_time", "is", null)
    .is("daily_summary", null);

  // Pending timesheet correction requests (employee wants a missing/wrong day fixed).
  const { data: pendingCorrections } = await supabase
    .from("attendance_correction_requests")
    .select("*, profiles!attendance_correction_requests_employee_id_fkey(full_name, employee_code)")
    .eq("status", "pending")
    .order("work_date", { ascending: false });

  let query = supabase
    .from("attendance")
    .select("*, profiles!attendance_employee_id_fkey(full_name, employee_code)", { count: "exact" })
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data: rows, count } = await query;

  // Per-(employee, day) BD job-application breakdown for the rich "eye" summary view (profile → count +
  // total), the same the employee sees on their dashboard — keyed by owner_bd_id|work_date.
  const empIds = Array.from(new Set((rows ?? []).map((r: any) => r.employee_id)));
  const workDates = Array.from(new Set((rows ?? []).map((r: any) => r.work_date)));
  const jobsByEmpDate: Record<string, JobLine[]> = {};
  if (empIds.length && workDates.length) {
    const { data: jrows } = await supabase
      .from("bd_job_applications")
      .select("owner_bd_id, work_date, count, profile:dev_profiles(profile_no, name)")
      .in("owner_bd_id", empIds)
      .in("work_date", workDates);
    for (const j of (jrows ?? []) as any[]) {
      const label = j.profile ? `#${j.profile.profile_no} ${j.profile.name}` : "—";
      (jobsByEmpDate[`${j.owner_bd_id}|${j.work_date}`] ??= []).push({ label, count: Number(j.count) || 0 });
    }
  }

  // Jobs HUNTED per (BD, day) — auto-counted from the shared job board (rows a BD added that day),
  // merging live rows with the persisted daily-count snapshot so counts survive board auto-cleanup.
  const huntedByEmpDate = empIds.length ? await huntedCountsForRange(supabase, empIds, from, to) : {};

  return (
    <FilterShell
      toolbar={
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
      }
    >
    <div className="space-y-6 pt-6">
      {(missingToday ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-warning"><AlertTriangle className="size-4" /> Missing today's task summary ({(missingToday ?? []).length})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(missingToday ?? []).map((m: any) => (
              <span key={m.employee_id} className="rounded-md border border-warning/40 bg-warning/5 px-2.5 py-1 text-caption text-text-primary">
                {m.profiles?.full_name ?? "—"}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {(pendingCorrections ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="size-4 text-brand-primary" /> Timesheet correction requests ({(pendingCorrections ?? []).length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Code</TH><TH>Employee</TH><TH>Day</TH><TH>Type</TH><TH>Requested in</TH><TH>Requested out</TH><TH>Reason</TH><TH>Action</TH></TR></THead>
              <TBody>
                {(pendingCorrections ?? []).map((c: any) => (
                  <TR key={c.id}>
                    <TD className="tabular text-text-secondary">{formatCode(c.profiles?.employee_code)}</TD>
                    <TD>{c.profiles?.full_name ?? "—"}</TD>
                    <TD className="tabular">{c.work_date}</TD>
                    <TD>{kindLabel[c.kind] ?? c.kind}</TD>
                    <TD className="tabular">{time(c.requested_check_in)}</TD>
                    <TD className="tabular">{time(c.requested_check_out)}</TD>
                    <TD className="max-w-[220px] truncate text-text-secondary">{c.reason ?? "—"}</TD>
                    <TD><CorrectionActions id={c.id} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                <TH>Hours</TH><TH>Deficit/Extra</TH><TH>Summary</TH><TH>Edit</TH>
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
                    <TD className="max-w-[240px]">
                      {(() => {
                        // Eye-only (owner 2026-07-22): no preview text (it collided with the icon) — just the
                        // eye to open the full summary, or a "missing" badge. Keep a small "late" flag.
                        const jobs = jobsByEmpDate[`${r.employee_id}|${r.work_date}`] ?? [];
                        const total = jobs.reduce((s, j) => s + j.count, 0);
                        const hunted = huntedByEmpDate[`${r.employee_id}|${r.work_date}`] ?? 0;
                        if (strip(r.daily_summary) || total > 0 || hunted > 0) {
                          return (
                            <div className="flex items-center gap-2">
                              <DaySummary workDate={r.work_date} notesHtml={r.daily_summary} jobs={jobs} hunted={hunted} />
                              {r.summary_late && <Badge tone="warning">late</Badge>}
                            </div>
                          );
                        }
                        return <Badge tone="warning">missing</Badge>;
                      })()}
                    </TD>
                    <TD>
                      <EditAttendance
                        attendanceId={r.id}
                        workDate={r.work_date}
                        employeeName={r.profiles?.full_name}
                        checkInTime={r.check_in_time}
                        checkOutTime={r.check_out_time}
                        mode="admin"
                      />
                    </TD>
                  </TR>
                );
              })}
              {(rows ?? []).length === 0 && (
                <TR><TD colSpan={9} className="py-6 text-center text-text-secondary">No attendance in this range.</TD></TR>
              )}
            </TBody>
          </Table>
          <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
        </CardContent>
      </Card>
    </div>
    </FilterShell>
  );
}
