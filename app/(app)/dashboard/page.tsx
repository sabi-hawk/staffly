import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { todayAttendance } from "@/lib/services/attendance";
import { myProfilesWithCounts } from "@/lib/services/bd-jobs";
import { companyToday } from "@/lib/time";
import { CheckWidget } from "@/components/attendance/check-widget";
import { DailySummary } from "@/components/attendance/daily-summary";
import { DailyReport } from "@/components/attendance/daily-report";
import { DaySummary, type JobLine } from "@/components/attendance/day-summary";
import Link from "next/link";
import { Contact, Briefcase, CalendarDays } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/utils";

// The employee dashboard is intentionally minimal: today's check-in, upcoming holidays, and recent
// days. Leave balances and extra/deficit-hour stats are NOT shown here (they nudge behaviour); the
// attendance summary (admin-toggleable) lives on the Attendance tab instead.
export default async function EmployeeDashboard() {
  const profile = (await getCurrentProfile())!;
  const canAttend = hasPermP(profile, PERM.attendanceSelf); // partners have no attendance duties
  const canCrm = hasPermP(profile, PERM.crmAccess);
  const supabase = createClient();

  // CRM-at-a-glance for BD / partner-BD users — fills an otherwise-empty dashboard for people without
  // attendance duties, and a quick jump into their work for everyone with CRM access.
  let myProfileCount = 0, myLeadCount = 0;
  if (canCrm) {
    const [pc, lc] = await Promise.all([
      supabase.from("dev_profiles").select("id", { count: "exact", head: true }).eq("owner_bd_id", profile.id),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_bd_id", profile.id).eq("status", "in_progress"),
    ]);
    myProfileCount = pc.count ?? 0;
    myLeadCount = lc.count ?? 0;
  }
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

  // Per-day job counts across the recent range, so each day's summary shows the full breakdown.
  const recentDates = (recent ?? []).map((r) => r.work_date);
  const jobsByDate: Record<string, JobLine[]> = {};
  if (jobProfiles.length && recentDates.length) {
    const { data: jrows } = await supabase
      .from("bd_job_applications")
      .select("work_date, count, profile:dev_profiles(profile_no, name)")
      .eq("owner_bd_id", profile.id)
      .in("work_date", recentDates);
    for (const j of (jrows ?? []) as any[]) {
      const label = j.profile ? `#${j.profile.profile_no} ${j.profile.name}` : "—";
      (jobsByDate[j.work_date] ??= []).push({ label, count: Number(j.count) || 0 });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-h1 text-text-primary">Good day, {profile.full_name.split(" ")[0]} 👋</h2>
        <p className="text-caption text-text-secondary">Here's your day at a glance.</p>
      </div>

      {/* Attendance widgets only for people with attendance duties — partners (no attendance.self) skip
          check-in / the daily summary entirely. */}
      {canAttend && <CheckWidget today={todayData as any} summaryMissing={summaryMissing} />}

      {/* CRM at a glance — for BD / partner-BD users (fills the dashboard for people with no check-in). */}
      {canCrm && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Your CRM at a glance</CardTitle>
            <Link href="/crm/profiles" className="text-caption font-medium text-brand-primary hover:underline">Open CRM →</Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/crm/profiles" className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-brand-primary/50 hover:bg-surface/50">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-primary/10 text-brand-primary"><Contact className="size-5" /></span>
                <span><span className="block text-h2 font-semibold tabular text-text-primary">{myProfileCount}</span><span className="text-caption text-text-secondary">Profiles assigned to you</span></span>
              </Link>
              <Link href="/crm/leads" className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-brand-primary/50 hover:bg-surface/50">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600"><Briefcase className="size-5" /></span>
                <span><span className="block text-h2 font-semibold tabular text-text-primary">{myLeadCount}</span><span className="text-caption text-text-secondary">Active leads you own</span></span>
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/crm/profiles" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-caption font-medium text-text-secondary hover:bg-surface"><Contact className="size-3.5" /> Profiles</Link>
              <Link href="/crm/leads" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-caption font-medium text-text-secondary hover:bg-surface"><Briefcase className="size-3.5" /> Leads</Link>
              <Link href="/crm/calendar" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-caption font-medium text-text-secondary hover:bg-surface"><CalendarDays className="size-3.5" /> CRM calendar</Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* One consolidated "Today's summary": BDs get job counts + notes; everyone else just notes. */}
      {canAttend && (jobProfiles.length > 0 || !!todayRow?.check_in_time) && (
        <DailyReport
          profiles={jobProfiles}
          workDate={today}
          checkedIn={!!todayRow?.check_in_time}
          notesHtml={todayRow?.daily_summary ?? null}
        />
      )}

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

      {canAttend && (
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
                  <TD>
                    {(() => {
                      const jobs = jobsByDate[r.work_date] ?? [];
                      const notesText = (r.daily_summary ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
                      const total = jobs.reduce((s, j) => s + j.count, 0);
                      if (notesText || total > 0) return <DaySummary workDate={r.work_date} notesHtml={r.daily_summary} jobs={jobs} />;
                      if (r.work_date === today) return <span className="text-caption text-text-secondary">Add it in “Today’s summary” above</span>;
                      return <DailySummary workDate={r.work_date} today={today} html={r.daily_summary} late={r.summary_late} />;
                    })()}
                  </TD>
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
      )}
    </div>
  );
}
