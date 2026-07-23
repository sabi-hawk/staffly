import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { resolveRange, type RangeKey } from "@/lib/time";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { BdPerformanceFilter } from "@/components/crm/bd-performance-filter";
import { FilterShell } from "@/components/crm/filter-shell";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { formatCrmDate } from "@/lib/utils";
import { Briefcase, CalendarClock, ClipboardList, Trophy, Send, type LucideIcon } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic";

// Categorical palette (validated colorblind-safe + contrast-safe against the light chart surface).
const SERIES = [
  { name: "Leads", color: "#2563eb" },
  { name: "Interviews", color: "#059669" },
  { name: "Assessments", color: "#d97706" },
];

// ISO week bucket (Monday) of a date, in Asia/Karachi.
function weekStart(dateIso: string): string {
  const d = new Date(new Date(dateIso).getTime() + 5 * 3600_000);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function MiniStat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-3.5 py-2.5">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${tone}`}><Icon className="size-4" /></span>
      <div className="min-w-0">
        <div className="text-lg font-semibold leading-none text-text-primary tabular">{value}</div>
        <div className="mt-1 truncate text-caption text-text-secondary">{label}</div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">{title}</h3>
      {children}
    </div>
  );
}

// BD Performance (admin/super via crm.analytics.view — revoked from BD/BD Lead, 0038):
// per-BD activity, weekly trend, and closed deals over a date range, filterable by BD.
export default async function BdPerformancePage({ searchParams }: { searchParams: { range?: string; from?: string; to?: string; bd?: string } }) {
  const me = await getCurrentProfile();
  if (!me || !hasPermP(me, PERM.crmAnalyticsView)) redirect("/dashboard");
  const supabase = createClient();
  const { from, to, range } = resolveRange((searchParams.range as RangeKey) ?? "week", searchParams.from, searchParams.to);
  const bdFilter = searchParams.bd || "";
  // Karachi day edges (a bare date would anchor to UTC midnight = 5am PKT and drop early rows).
  const fromISO = new Date(`${from}T00:00:00+05:00`).toISOString();
  const toISO = new Date(`${to}T23:59:59.999+05:00`).toISOString();

  const [bdsRes, leadsRes, ivRes, asRes, appsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("department", "Business Development").order("full_name"),
    supabase.from("leads").select("owner_bd_id, status, created_at, updated_at")
      .or(`and(created_at.gte.${fromISO},created_at.lte.${toISO}),and(status.eq.closed,updated_at.gte.${fromISO},updated_at.lte.${toISO})`),
    supabase.from("interviews").select("owner_bd_id, outcome, received_date").gte("received_date", from).lte("received_date", to),
    supabase.from("assessments").select("owner_bd_id, entry_date").gte("entry_date", from).lte("entry_date", to),
    supabase.from("bd_job_applications").select("owner_bd_id, dev_profile_id, count, work_date, profile:dev_profiles(profile_no, name)")
      .gte("work_date", from).lte("work_date", to),
  ]);
  const allBds = bdsRes.data ?? [];
  const bds = bdFilter ? allBds.filter((b) => b.id === bdFilter) : allBds;
  const bdIds = new Set(bds.map((b) => b.id));
  const keep = (ownerId: string | null) => !bdFilter || ownerId === bdFilter;
  const leads = ((leadsRes.data ?? []) as any[]).filter((l) => keep(l.owner_bd_id));
  const interviews = ((ivRes.data ?? []) as any[]).filter((i) => keep(i.owner_bd_id));
  const assessments = ((asRes.data ?? []) as any[]).filter((a) => keep(a.owner_bd_id));
  const inRange = (iso: string | null) => !!iso && iso >= fromISO && iso <= toISO;

  // Job applications (0050): per-BD total + per-profile (segregated) totals over the range.
  const appRows = ((appsRes.data ?? []) as any[]).filter((a) => keep(a.owner_bd_id));
  const appsByBd = new Map<string, number>();
  const appsByProfile = new Map<string, { label: string; ownerId: string; count: number }>();
  for (const a of appRows) {
    const c = Number(a.count) || 0;
    appsByBd.set(a.owner_bd_id, (appsByBd.get(a.owner_bd_id) ?? 0) + c);
    const label = a.profile ? `#${a.profile.profile_no} ${a.profile.name}` : "—";
    const prev = appsByProfile.get(a.dev_profile_id) ?? { label, ownerId: a.owner_bd_id, count: 0 };
    prev.count += c;
    appsByProfile.set(a.dev_profile_id, prev);
  }
  const totalApps = Array.from(appsByBd.values()).reduce((s, n) => s + n, 0);
  const bdName = (id: string) => allBds.find((b) => b.id === id)?.full_name ?? "—";
  const profileApps = Array.from(appsByProfile.values())
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  const rows = bds.map((b) => {
    const myLeads = leads.filter((l) => l.owner_bd_id === b.id);
    const myIv = interviews.filter((i) => i.owner_bd_id === b.id);
    const myAs = assessments.filter((a) => a.owner_bd_id === b.id);
    return {
      id: b.id,
      name: b.full_name,
      leads: myLeads.filter((l) => inRange(l.created_at)).length,
      interviews: myIv.length,
      selected: myIv.filter((i) => i.outcome === "selected").length,
      assessments: myAs.length,
      applications: appsByBd.get(b.id) ?? 0,
      closed: myLeads.filter((l) => l.status === "closed" && inRange(l.updated_at)).length,
      dismissed: myLeads.filter((l) => (l.status === "dismissed" || l.status === "rejected") && inRange(l.created_at)).length,
    };
  });

  const totals = rows.reduce(
    (t, r) => ({ leads: t.leads + r.leads, interviews: t.interviews + r.interviews, assessments: t.assessments + r.assessments, closed: t.closed + r.closed }),
    { leads: 0, interviews: 0, assessments: 0, closed: 0 }
  );

  // weekly trend buckets (leads by entry, interviews by received, assessments by received)
  const weeks = new Map<string, number[]>();
  const bump = (iso: string | null, idx: number) => {
    if (!iso) return;
    const w = weekStart(iso);
    if (!weeks.has(w)) weeks.set(w, [0, 0, 0]);
    weeks.get(w)![idx] += 1;
  };
  leads.forEach((l) => inRange(l.created_at) && bump(l.created_at, 0));
  interviews.forEach((i) => bump(i.received_date, 1));
  assessments.forEach((a) => bump(a.entry_date, 2));
  const trend = Array.from(weeks.entries()).sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([w, values]) => ({ label: formatCrmDate(w).slice(0, 6), values }));

  const hasBarData = rows.some((r) => r.leads + r.interviews + r.assessments > 0);

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>BD Performance</CardTitle>
          <CardDescription>{formatCrmDate(from)} → {formatCrmDate(to)} (inclusive) · applications & leads by date, deals by close date</CardDescription>
        </div>
        <BdPerformanceFilter range={range} from={from} to={to} bd={bdFilter} bds={allBds} />
      </CardHeader>
      <CardContent>
        <FilterShell toolbar={null}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MiniStat label="Job applications" value={totalApps} icon={Send} tone="bg-brand-primary/10 text-brand-primary" />
            <MiniStat label="Leads" value={totals.leads} icon={Briefcase} tone="bg-brand-light text-brand-primary" />
            <MiniStat label="Interviews" value={totals.interviews} icon={CalendarClock} tone="bg-success/10 text-success" />
            <MiniStat label="Assessments" value={totals.assessments} icon={ClipboardList} tone="bg-warning/10 text-warning" />
            <MiniStat label="Deals closed" value={totals.closed} icon={Trophy} tone="bg-gray-100 text-text-secondary" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Panel title={bdFilter ? "Activity" : "Activity per BD"}>
              {hasBarData ? (
                <BarChart groups={rows.map((r) => ({ label: r.name, values: [r.leads, r.interviews, r.assessments], id: r.id }))} series={SERIES} drilldownParam={bdFilter ? undefined : "bd"} />
              ) : (
                <p className="py-10 text-center text-caption text-text-secondary">No activity in this range.</p>
              )}
            </Panel>
            <Panel title="Weekly trend">
              {trend.length > 0 ? (
                <LineChart points={trend} series={SERIES} />
              ) : (
                <p className="py-10 text-center text-caption text-text-secondary">No activity in this range.</p>
              )}
            </Panel>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Breakdown</h3>
            <Table>
              <THead>
                <TR><TH>BD</TH><TH>Applications</TH><TH>Leads</TH><TH>Interviews</TH><TH>Selected</TH><TH>Assessments</TH><TH>Deals closed</TH><TH>Dismissed/Rejected</TH></TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{r.name}</TD>
                    <TD className="tabular font-medium">{r.applications}</TD>
                    <TD className="tabular">{r.leads}</TD>
                    <TD className="tabular">{r.interviews}</TD>
                    <TD className="tabular">{r.selected}</TD>
                    <TD className="tabular">{r.assessments}</TD>
                    <TD className="tabular font-medium">{r.closed}</TD>
                    <TD className="tabular text-text-secondary">{r.dismissed}</TD>
                  </TR>
                ))}
                {rows.length === 0 && <TR><TD colSpan={8} className="py-6 text-center text-text-secondary">No BDs found.</TD></TR>}
              </TBody>
            </Table>
          </div>

          {/* Segregated per-profile application counts over the range (owner: profile-level visibility). */}
          <div className="mt-4 rounded-lg border border-border bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Job applications by profile</h3>
            {profileApps.length > 0 ? (
              <Table>
                <THead>
                  <TR><TH>Profile</TH>{!bdFilter && <TH>BD</TH>}<TH className="text-right">Applications</TH></TR>
                </THead>
                <TBody>
                  {profileApps.map((p) => (
                    <TR key={p.label + p.ownerId}>
                      <TD className="font-medium">{p.label}</TD>
                      {!bdFilter && <TD className="text-text-secondary">{bdName(p.ownerId)}</TD>}
                      <TD className="tabular text-right font-medium">{p.count}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-caption text-text-secondary">No job applications logged in this range.</p>
            )}
          </div>
        </FilterShell>
      </CardContent>
    </Card>
  );
}
