import { Users, UserCheck, Clock, Plane, Wifi } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { companyToday } from "@/lib/time";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge, Badge } from "@/components/ui/badge";

const time = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function AdminDashboard() {
  const supabase = createClient();
  const today = companyToday();

  const { data: employees } = await supabase
    .from("profiles").select("id, full_name, employment_type, status, role")
    .eq("status", "active").eq("role", "employee"); // admins are not counted as staff
  const emps = employees ?? [];

  const { data: todayAtt } = await supabase.from("attendance").select("*").eq("work_date", today);
  const attByEmp = new Map((todayAtt ?? []).map((a) => [a.employee_id, a]));

  const { data: leavesToday } = await supabase
    .from("leave_requests").select("employee_id").eq("status", "approved")
    .lte("start_date", today).gte("end_date", today);
  const onLeave = new Set((leavesToday ?? []).map((l) => l.employee_id));

  const checkedIn = (todayAtt ?? []).filter((a) => a.check_in_time && !a.check_out_time).length;
  const remote = emps.filter((e) => e.employment_type === "remote").length;

  const { data: alerts } = await supabase
    .from("alerts_log").select("*, profiles(full_name)")
    .order("triggered_at", { ascending: false }).limit(8);

  function statusFor(empId: string) {
    if (onLeave.has(empId)) return <StatusBadge status="on_leave" />;
    const a = attByEmp.get(empId);
    if (!a || !a.check_in_time) return <StatusBadge status="awaiting" />;
    if (a.check_out_time) return <StatusBadge status="done" />;
    return <StatusBadge status={a.status === "late" ? "late" : "working"} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total staff" value={emps.length} icon={Users} />
        <StatCard label="Checked in" value={checkedIn} icon={UserCheck} tone="success" />
        <StatCard label="Awaiting" value={Math.max(emps.length - checkedIn - onLeave.size, 0)} icon={Clock} tone="warning" />
        <StatCard label="On leave" value={onLeave.size} icon={Plane} tone="neutral" />
        <StatCard label="Remote" value={remote} icon={Wifi} tone="brand" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Live status — {today}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Employee</TH><TH>Type</TH><TH>In</TH><TH>Out</TH><TH>Status</TH></TR></THead>
              <TBody>
                {emps.map((e) => {
                  const a = attByEmp.get(e.id);
                  return (
                    <TR key={e.id}>
                      <TD>{e.full_name}</TD>
                      <TD className="capitalize text-text-secondary">{e.employment_type}</TD>
                      <TD className="tabular">{time(a?.check_in_time ?? null)}</TD>
                      <TD className="tabular">{time(a?.check_out_time ?? null)}</TD>
                      <TD>{statusFor(e.id)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Alerts feed</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(alerts ?? []).length === 0 && <p className="text-caption text-text-secondary">No alerts. All clear.</p>}
            {(alerts ?? []).map((al: any) => {
              const danger = al.type.includes("missed");
              const label =
                al.type === "missed_checkin" ? "Missed check-in" :
                al.type === "missed_checkout" ? "Missed checkout" :
                al.type === "overtime_warning" ? "Overtime" :
                al.type === "late_arrival" ? "Late arrival" : al.type.replace(/_/g, " ");
              return (
                <div key={al.id} className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${danger ? "bg-danger" : "bg-warning"}`} />
                  <div className="min-w-0">
                    <div className={`text-caption font-semibold ${danger ? "text-danger" : "text-warning"}`}>{label}</div>
                    <div className="text-caption text-text-secondary">{al.message}</div>
                    <div className="text-[11px] text-text-secondary/70">
                      {new Date(al.triggered_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
