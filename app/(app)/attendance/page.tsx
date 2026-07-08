import { Clock, TrendingDown, CalendarCheck, CalendarX, Plane } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { companyToday, resolveRange, RANGE_LABELS, type RangeKey } from "@/lib/time";
import { todayAttendance } from "@/lib/services/attendance";
import { buildEmployeeReport } from "@/lib/services/reports";
import { CheckWidget } from "@/components/attendance/check-widget";
import { SummaryRange } from "@/components/attendance/summary-range";
import { EditAttendance } from "@/components/attendance/edit-attendance";
import { DailySummary } from "@/components/attendance/daily-summary";
import { DaySummary, type JobLine } from "@/components/attendance/day-summary";
import { CorrectionRequest } from "@/components/attendance/correction-request";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatHours, formatCrmDate } from "@/lib/utils";

const time = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—";
const corrTone = (s: string) => (s === "approved" ? "success" : s === "rejected" ? "danger" : "warning");
const corrKind: Record<string, string> = { missing: "Missing day", wrong_time: "Wrong times", forgot_checkout: "Forgot checkout" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const today = companyToday();
  const todayData = await todayAttendance(supabase, profile.id);
  const admin = hasPermP(profile, PERM.attendanceViewAll);

  // The attendance summary + the deficit/extra column are shown to employees only when the admin flag
  // is on (default true); admins always see them.
  const { data: settings } = await supabase
    .from("company_settings").select("show_employee_attendance_summary").eq("id", 1).maybeSingle();
  const showSummary = admin || (settings?.show_employee_attendance_summary ?? true);

  // Summary + history share ONE date range so they're symmetric. Default = this month (1st → today).
  // BD: This month / Last 3 months / custom (capped at 3 months back); admin: any range.
  const { from, to, range } = resolveRange((searchParams.range as RangeKey) ?? "month", searchParams.from, searchParams.to);
  const minFrom = admin ? undefined : resolveRange("3m").from; // BD can't go before 3 months
  const summary = showSummary ? await buildEmployeeReport(supabase, profile.id, from, to) : null;

  const { data: history } = await supabase
    .from("attendance").select("*").eq("employee_id", profile.id)
    .gte("work_date", from).lte("work_date", to)
    .order("work_date", { ascending: false });

  // Per-day job counts across the shown range so each day's summary shows the full breakdown (BDs only;
  // returns nothing for a user who owns no profiles).
  const jobsByDate: Record<string, JobLine[]> = {};
  const histDates = (history ?? []).map((r) => r.work_date);
  if (histDates.length) {
    const { data: jrows } = await supabase
      .from("bd_job_applications")
      .select("work_date, count, profile:dev_profiles(profile_no, name)")
      .eq("owner_bd_id", profile.id)
      .in("work_date", histDates);
    for (const j of (jrows ?? []) as any[]) {
      const label = j.profile ? `#${j.profile.profile_no} ${j.profile.name}` : "—";
      (jobsByDate[j.work_date] ??= []).push({ label, count: Number(j.count) || 0 });
    }
  }

  // Today's row is fetched independently of the range so the "missing summary" prompt always shows.
  const { data: todayRow } = await supabase
    .from("attendance").select("daily_summary, summary_late, check_in_time")
    .eq("employee_id", profile.id).eq("work_date", today).maybeSingle();
  const todaySummaryMissing = !!todayRow?.check_in_time && !(todayRow.daily_summary ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();

  // This employee's recent timesheet correction requests (pending shown prominently).
  const { data: myCorrections } = await supabase
    .from("attendance_correction_requests")
    .select("id, work_date, kind, requested_check_in, requested_check_out, status, decision_note")
    .eq("employee_id", profile.id)
    .order("work_date", { ascending: false })
    .limit(8);

  return (
    <div className="space-y-6">
      <CheckWidget today={todayData as any} summaryMissing={todaySummaryMissing} />

      {todaySummaryMissing && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
          <p className="text-sm text-text-primary">
            <span className="font-medium text-warning">⚠ Today's task summary is missing.</span>{" "}
            <span className="text-text-secondary">Please add a couple of lines on what you worked on, before you sign off for the day.</span>
          </p>
          <DailySummary workDate={today} today={today} html={todayRow!.daily_summary} late={todayRow!.summary_late} />
        </div>
      )}

      {summary && (
        <Card>
          <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Summary · {RANGE_LABELS[range]}</CardTitle>
              <p className="mt-0.5 text-caption text-text-secondary">{formatCrmDate(from)} → {formatCrmDate(to)} (inclusive)</p>
            </div>
            <SummaryRange range={range} from={from} to={to} allowCustom minFrom={minFrom} />
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
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">Timesheet corrections</CardTitle>
          <CorrectionRequest triggerLabel="Fix a day" />
        </CardHeader>
        <CardContent>
          {(myCorrections ?? []).length > 0 ? (
            <Table>
              <THead><TR><TH>Day</TH><TH>Type</TH><TH>Requested in</TH><TH>Requested out</TH><TH>Status</TH></TR></THead>
              <TBody>
                {(myCorrections ?? []).map((c: any) => (
                  <TR key={c.id}>
                    <TD className="tabular">{c.work_date}</TD>
                    <TD>{corrKind[c.kind] ?? c.kind}</TD>
                    <TD className="tabular">{time(c.requested_check_in)}</TD>
                    <TD className="tabular">{time(c.requested_check_out)}</TD>
                    <TD>
                      <Badge tone={corrTone(c.status) as any}>{c.status}</Badge>
                      {c.status === "rejected" && c.decision_note && <div className="mt-1 max-w-[220px] text-caption text-danger">{c.decision_note}</div>}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-caption text-text-secondary">Missed a day, or forgot to check in/out? Use <span className="font-medium text-text-primary">Fix a day</span> to send the real times for admin approval.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Attendance history</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>In</TH><TH>Out</TH><TH>Hours</TH>{showSummary && <TH>Deficit/Extra</TH>}<TH>Task summary</TH><TH></TH></TR>
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
                    <TD>
                      {(() => {
                        const jobs = jobsByDate[r.work_date] ?? [];
                        const notesText = (r.daily_summary ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
                        const total = jobs.reduce((s, j) => s + j.count, 0);
                        // A day with a summary → eye view of the full breakdown (counts + notes). Otherwise
                        // the add/late control (today: add; past missing: add late).
                        return notesText || total > 0
                          ? <DaySummary workDate={r.work_date} notesHtml={r.daily_summary} jobs={jobs} />
                          : <DailySummary workDate={r.work_date} today={today} html={r.daily_summary} late={r.summary_late} />;
                      })()}
                    </TD>
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
