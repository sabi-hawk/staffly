import { CalendarDays, TrendingUp, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { leaveSummary } from "@/lib/services/leaves";
import { todayAttendance } from "@/lib/services/attendance";
import { companyToday } from "@/lib/time";
import { CheckWidget } from "@/components/attendance/check-widget";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/utils";
import { workLogPreview } from "@/lib/worklog";

export default async function EmployeeDashboard() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const todayData = await todayAttendance(supabase, profile.id);

  const { data: recent } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", profile.id)
    .order("work_date", { ascending: false })
    .limit(7);

  const summary = await leaveSummary(supabase, profile.id);
  const { data: upcomingHolidays } = await supabase
    .from("holidays").select("*").gte("holiday_date", companyToday()).order("holiday_date").limit(4);

  const totalExtra = (recent ?? []).reduce((s, r) => s + Number(r.extra_hours || 0), 0);
  const totalDeficit = (recent ?? []).reduce((s, r) => s + Number(r.deficit_hours || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-h1 text-text-primary">Good day, {profile.full_name.split(" ")[0]} 👋</h2>
        <p className="text-caption text-text-secondary">Here's your day at a glance.</p>
      </div>

      <CheckWidget today={todayData as any} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Annual leave left" value={summary.annualRemaining} icon={CalendarDays} />
        <StatCard label="Casual this month" value={summary.casualRemaining} icon={CalendarDays} tone="success" />
        <StatCard label="Extra hours (7d)" value={formatHours(totalExtra)} icon={TrendingUp} tone="success" />
        <StatCard label="Deficit hours (7d)" value={formatHours(totalDeficit)} icon={AlertTriangle} tone="danger" />
      </div>

      {(upcomingHolidays ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Upcoming holidays</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(upcomingHolidays ?? []).map((h) => (
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
                <TH>Deficit / Extra</TH>
                <TH>Log</TH>
              </TR>
            </THead>
            <TBody>
              {(recent ?? []).map((r) => (
                <TR key={r.id}>
                  <TD className="tabular">{r.work_date}</TD>
                  <TD className="tabular">{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—"}</TD>
                  <TD className="tabular">{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : <Badge tone="danger">open</Badge>}</TD>
                  <TD className="tabular">{formatHours(r.total_hours)}</TD>
                  <TD className="tabular">
                    {Number(r.deficit_hours) > 0 && <Badge tone="danger">-{formatHours(r.deficit_hours)}</Badge>}
                    {Number(r.extra_hours) > 0 && <Badge tone="success">+{formatHours(r.extra_hours)}</Badge>}
                    {Number(r.deficit_hours) === 0 && Number(r.extra_hours) === 0 && r.total_hours != null && <span className="text-text-secondary">—</span>}
                  </TD>
                  <TD className="max-w-[220px] truncate text-text-secondary">{workLogPreview(r.work_log) || "—"}</TD>
                </TR>
              ))}
              {(recent ?? []).length === 0 && (
                <TR>
                  <TD className="py-6 text-center text-text-secondary">No attendance yet — check in to start.</TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
