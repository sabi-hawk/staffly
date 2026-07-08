import Link from "next/link";
import { Users, UserCheck, Clock, Plane, Wifi, Bell, AlertTriangle, CalendarClock, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyToday, karachiMidnightISO } from "@/lib/time";
import { refreshAdminNotifications, getAdminNotifications } from "@/lib/services/notifications";
import { findMissedCheckin, findMissedCheckout } from "@/lib/services/crons";
import { StatCard } from "@/components/ui/stat-card";
import { DismissNotification } from "@/components/admin/dismiss-notification";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge, Badge } from "@/components/ui/badge";

const time = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function AdminDashboard() {
  const supabase = createClient();
  const today = companyToday();

  const dayStart = karachiMidnightISO(today);
  const dayEnd = new Date(new Date(dayStart).getTime() + 86400000).toISOString();

  // Missed check-in / overdue-checkout are computed LIVE on load (no cron needed) — service-role client
  // so we can scan every employee's shift + attendance. See the alerts backlog note for re-enabling the
  // scheduled email alerts (Supabase pg_cron, free). This page is admin-gated by middleware.
  const admin = createAdminClient();

  // Independent reads run in parallel (was ~7 sequential round-trips).
  const [empRes, attRes, leavesRes, pendingRes, interviewsRes, notifications, missedIn, overdueOut] =
    await Promise.all([
      supabase
        .from("profiles").select("id, full_name, employment_type, status, role")
        .eq("status", "active").eq("role", "employee"), // admins are not counted as staff
      supabase
        .from("attendance").select("employee_id, check_in_time, check_out_time, status")
        .eq("work_date", today),
      supabase
        .from("leave_requests").select("employee_id").eq("status", "approved")
        .lte("start_date", today).gte("end_date", today),
      supabase
        .from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("interviews").select("id", { count: "exact", head: true })
        .gte("interview_at", dayStart).lt("interview_at", dayEnd),
      // refresh must precede the read, so chain just these two
      refreshAdminNotifications(supabase).then(() => getAdminNotifications(supabase)),
      findMissedCheckin(admin),
      findMissedCheckout(admin),
    ]);
  const emps = empRes.data ?? [];
  const todayAtt = attRes.data ?? [];
  const attByEmp = new Map(todayAtt.map((a) => [a.employee_id, a]));
  const onLeave = new Set((leavesRes.data ?? []).map((l) => l.employee_id));
  const pendingLeaves = pendingRes.count;
  const interviewsToday = interviewsRes.count;
  // Live attendance alerts (computed now, not from the cron/alerts_log feed).
  const liveAlerts = [
    ...missedIn.map((m) => ({ key: `in-${m.id}`, danger: false, label: "Not checked in", message: `${m.full_name} hasn't checked in (shift ${m.shift_start}).` })),
    ...overdueOut.map((m) => ({ key: `out-${m.id}`, danger: true, label: "Still checked in", message: `${m.full_name} is still checked in from ${m.work_date} — forgot to check out, or working late.` })),
  ];

  const checkedIn = todayAtt.filter((a) => a.check_in_time && !a.check_out_time).length;
  const remote = emps.filter((e) => e.employment_type === "remote").length;
  const attention = [
    (pendingLeaves ?? 0) > 0 && { href: "/admin/leaves", label: `${pendingLeaves} leave request${pendingLeaves === 1 ? "" : "s"} awaiting approval`, icon: Plane },
    (interviewsToday ?? 0) > 0 && { href: "/crm/calendar", label: `${interviewsToday} interview${interviewsToday === 1 ? "" : "s"} scheduled today`, icon: CalendarClock },
  ].filter(Boolean) as { href: string; label: string; icon: any }[];

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

      {attention.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-warning"><AlertTriangle className="size-4" /> Needs your attention</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {attention.map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 hover:bg-warning/10">
                <span className="flex items-center gap-2 text-sm text-text-primary"><a.icon className="size-4 text-warning" /> {a.label}</span>
                <ChevronRight className="size-4 text-text-secondary" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {notifications.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="size-4" /> Notifications ({notifications.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 rounded-md p-2 hover:bg-surface">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.severity === "warning" ? "bg-warning" : "bg-brand-primary"}`} />
                <Link href={n.link ?? "#"} className="min-w-0 flex-1">
                  <div className="text-sm text-text-primary">{n.message}</div>
                  <div className="text-[11px] text-text-secondary capitalize">{n.type.replace(/_/g, " ")}</div>
                </Link>
                <DismissNotification id={n.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Live status · {today}</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Attendance alerts · live</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {liveAlerts.length === 0 && <p className="text-caption text-text-secondary">No alerts. Everyone is on track.</p>}
            {liveAlerts.slice(0, 12).map((al) => (
              <div key={al.key} className="flex gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${al.danger ? "bg-danger" : "bg-warning"}`} />
                <div className="min-w-0">
                  <div className={`text-caption font-semibold ${al.danger ? "text-danger" : "text-warning"}`}>{al.label}</div>
                  <div className="text-caption text-text-secondary">{al.message}</div>
                </div>
              </div>
            ))}
            {liveAlerts.length > 12 && <p className="text-caption text-text-secondary">+{liveAlerts.length - 12} more</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
