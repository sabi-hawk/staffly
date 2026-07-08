import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { todayAttendance } from "@/lib/services/attendance";
import { myProfilesWithCounts } from "@/lib/services/bd-jobs";
import { companyToday } from "@/lib/time";
import { CheckWidget } from "@/components/attendance/check-widget";
import { DailySummary } from "@/components/attendance/daily-summary";
import { BdJobCounts } from "@/components/attendance/bd-job-counts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/utils";

// The employee dashboard is intentionally minimal: today's check-in, upcoming holidays, and recent
// days. Leave balances and extra/deficit-hour stats are NOT shown here (they nudge behaviour); the
// attendance summary (admin-toggleable) lives on the Attendance tab instead.
export default async function EmployeeDashboard() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const today = companyToday();
  const todayData = await todayAttendance(supabase, profile.id);

  const { data: recent } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", profile.id)
    .order("work_date", { ascending: false })
    .limit(7);

  // audience-aware: only holidays that apply to THIS employee (dept scope + deal-dev flag, 0041)
  const { data: upcomingHolidays } = await supabase
    .rpc("employee_holidays", { p_employee: profile.id, p_from: companyToday(), p_to: "2099-12-31" })
    .limit(4);

  const todayRow = (recent ?? []).find((r) => r.work_date === today);
  const summaryMissing = !!todayRow?.check_in_time && !(todayRow.daily_summary ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();

  // Deals this employee is assigned to (NAME only — never financials; via the my_deals() definer fn).
  const { data: myDeals } = await supabase.rpc("my_deals");
  const dealNames = Array.from(new Set(((myDeals ?? []) as any[]).map((d) => d.name).filter(Boolean)));

  // BD daily job applications: the profiles this user OWNS (empty for non-BDs → card hidden).
  const jobProfiles = await myProfilesWithCounts(supabase, profile.id, today);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-h1 text-text-primary">Good day, {profile.full_name.split(" ")[0]} 👋</h2>
        <p className="text-caption text-text-secondary">Here's your day at a glance.</p>
      </div>

      <CheckWidget today={todayData as any} summaryMissing={summaryMissing} />

      {/* BD-primary: log today's job applications per assigned profile (hidden for non-BDs). */}
      {jobProfiles.length > 0 && <BdJobCounts profiles={jobProfiles} workDate={today} />}

      {dealNames.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Your deals</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {dealNames.map((n) => (
              <span key={n as string} className="rounded-md border border-border bg-surface px-3 py-1.5 text-caption font-medium text-text-primary">{n as string}</span>
            ))}
          </CardContent>
        </Card>
      )}

      {(upcomingHolidays ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Upcoming holidays</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(upcomingHolidays ?? []).map((h: { id: string; name: string; holiday_date: string }) => (
              <span key={h.id} className="rounded-md border border-border px-3 py-1.5 text-caption">
                <span className="font-medium text-text-primary">{h.name}</span>
                <span className="text-text-secondary"> · {h.holiday_date}</span>
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent days</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>In</TH>
                <TH>Out</TH>
                <TH>Hours</TH>
                <TH>Task summary</TH>
              </TR>
            </THead>
            <TBody>
              {(recent ?? []).map((r) => (
                <TR key={r.id}>
                  <TD className="tabular">{r.work_date}</TD>
                  <TD className="tabular">{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—"}</TD>
                  <TD className="tabular">{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : <Badge tone="danger">open</Badge>}</TD>
                  <TD className="tabular">{formatHours(r.total_hours)}</TD>
                  <TD><DailySummary workDate={r.work_date} today={today} html={r.daily_summary} late={r.summary_late} /></TD>
                </TR>
              ))}
              {(recent ?? []).length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-6 text-center text-text-secondary">No attendance yet. Check in to start.</TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
