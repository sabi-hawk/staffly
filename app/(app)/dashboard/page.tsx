import { CalendarDays, TrendingUp, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { companyToday } from "@/lib/time";
import { CheckWidget } from "@/components/attendance/check-widget";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/utils";
import { workLogPreview } from "@/components/work-log-editor";

export default async function EmployeeDashboard() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const today = companyToday();

  const { data: todayRow } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", profile.id)
    .eq("work_date", today)
    .maybeSingle();

  const { data: recent } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", profile.id)
    .order("work_date", { ascending: false })
    .limit(7);

  const year = new Date().getFullYear();
  const { data: balance } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("employee_id", profile.id)
    .eq("year", year)
    .order("casual_month", { ascending: false })
    .limit(1)
    .maybeSingle();

  const totalExtra = (recent ?? []).reduce((s, r) => s + Number(r.extra_hours || 0), 0);
  const totalDeficit = (recent ?? []).reduce((s, r) => s + Number(r.deficit_hours || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-h1 text-text-primary">Good day, {profile.full_name.split(" ")[0]} 👋</h2>
        <p className="text-caption text-text-secondary">Here's your day at a glance.</p>
      </div>

      <CheckWidget today={todayRow as any} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Annual leave left" value={balance ? balance.annual_total - balance.annual_used : 8} icon={CalendarDays} />
        <StatCard label="Casual this month" value={balance ? Math.max(1 - balance.casual_used, 0) : 1} icon={CalendarDays} tone="success" />
        <StatCard label="Extra hours (7d)" value={formatHours(totalExtra)} icon={TrendingUp} tone="success" />
        <StatCard label="Deficit hours (7d)" value={formatHours(totalDeficit)} icon={AlertTriangle} tone="danger" />
      </div>

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
