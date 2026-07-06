import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { resolveRange, type RangeKey } from "@/lib/time";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { CrmDateFilter } from "@/components/crm/crm-date-filter";
import { FilterShell } from "@/components/crm/filter-shell";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { formatCrmDate } from "@/lib/utils";
import { Briefcase, CalendarClock, ClipboardList, Trophy } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic";

const SERIES = [
  { name: "Leads", color: "hsl(217 71% 53%)" },
  { name: "Interviews", color: "hsl(160 60% 40%)" },
  { name: "Assessments", color: "hsl(35 90% 55%)" },
];

// ISO week bucket (Monday) of a date, in Asia/Karachi.
function weekStart(dateIso: string): string {
  const d = new Date(new Date(dateIso).getTime() + 5 * 3600_000);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

// BD Performance (admin/super via crm.analytics.view — revoked from BD/BD Lead, 0038):
// per-BD activity, weekly trend, and closed deals over a date range.
export default async function BdPerformancePage({ searchParams }: { searchParams: { range?: string; from?: string; to?: string } }) {
  const me = await getCurrentProfile();
  if (!me || !hasPermP(me, PERM.crmAnalyticsView)) redirect("/dashboard");
  const supabase = createClient();
  const { from, to, range } = resolveRange((searchParams.range as RangeKey) ?? "1m", searchParams.from, searchParams.to);
  // Karachi day edges (a bare date would anchor to UTC midnight = 5am PKT and drop early rows).
  const fromISO = new Date(`${from}T00:00:00+05:00`).toISOString();
  const toISO = new Date(`${to}T23:59:59.999+05:00`).toISOString();

  const [bdsRes, leadsRes, ivRes, asRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("department", "Business Development").order("full_name"),
    // leads created in range PLUS closed deals whose close (last update) falls in range
    supabase.from("leads").select("owner_bd_id, status, created_at, updated_at")
      .or(`and(created_at.gte.${fromISO},created_at.lte.${toISO}),and(status.eq.closed,updated_at.gte.${fromISO},updated_at.lte.${toISO})`),
    supabase.from("interviews").select("owner_bd_id, outcome, received_date").gte("received_date", from).lte("received_date", to),
    supabase.from("assessments").select("owner_bd_id, entry_date").gte("entry_date", from).lte("entry_date", to),
  ]);
  const bds = bdsRes.data ?? [];
  const leads = (leadsRes.data ?? []) as any[];
  const interviews = (ivRes.data ?? []) as any[];
  const assessments = (asRes.data ?? []) as any[];
  const inRange = (iso: string | null) => !!iso && iso >= fromISO && iso <= toISO;

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

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>BD Performance</CardTitle>
          <CardDescription>{formatCrmDate(from)} → {formatCrmDate(to)} (inclusive) · leads by entry date, deals by close date</CardDescription>
        </div>
        <CrmDateFilter range={range} from={from} to={to} />
      </CardHeader>
      <CardContent>
        <FilterShell toolbar={null}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Leads" value={totals.leads} icon={Briefcase} tone="brand" />
            <StatCard label="Interviews" value={totals.interviews} icon={CalendarClock} tone="success" />
            <StatCard label="Assessments" value={totals.assessments} icon={ClipboardList} tone="warning" />
            <StatCard label="Deals closed" value={totals.closed} icon={Trophy} tone="neutral" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text-primary">Activity per BD</h3>
              <BarChart groups={rows.map((r) => ({ label: r.name, values: [r.leads, r.interviews, r.assessments] }))} series={SERIES} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text-primary">Weekly trend</h3>
              <LineChart points={trend} series={SERIES} />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Breakdown</h3>
            <Table>
              <THead>
                <TR><TH>BD</TH><TH>Leads</TH><TH>Interviews</TH><TH>Selected</TH><TH>Assessments</TH><TH>Deals closed</TH><TH>Dismissed/Rejected</TH></TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{r.name}</TD>
                    <TD className="tabular">{r.leads}</TD>
                    <TD className="tabular">{r.interviews}</TD>
                    <TD className="tabular">{r.selected}</TD>
                    <TD className="tabular">{r.assessments}</TD>
                    <TD className="tabular font-medium">{r.closed}</TD>
                    <TD className="tabular text-text-secondary">{r.dismissed}</TD>
                  </TR>
                ))}
                {rows.length === 0 && <TR><TD colSpan={7} className="py-6 text-center text-text-secondary">No BDs found.</TD></TR>}
              </TBody>
            </Table>
          </div>
        </FilterShell>
      </CardContent>
    </Card>
  );
}
