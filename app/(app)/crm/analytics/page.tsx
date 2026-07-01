import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/crm/access";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Stat = { leads: number; disqualified: number; interviews: number; assessments: number; deals: number };

export default async function CrmAnalyticsPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/");
  const canSeeDeals = isAdminRole(me.role);
  const supabase = createClient();

  // RLS scopes rows to what the viewer may see: a BD gets only their own; admin/BD-Lead get all.
  const [leadsRes, ivRes, asRes] = await Promise.all([
    supabase.from("leads").select("owner_bd_id, status"),
    supabase.from("interviews").select("owner_bd_id"),
    supabase.from("assessments").select("owner_bd_id"),
  ]);

  const stats = new Map<string, Stat>();
  const get = (id: string | null): Stat | null => {
    if (!id) return null;
    if (!stats.has(id)) stats.set(id, { leads: 0, disqualified: 0, interviews: 0, assessments: 0, deals: 0 });
    return stats.get(id)!;
  };

  for (const l of (leadsRes.data ?? []) as any[]) {
    const s = get(l.owner_bd_id);
    if (!s) continue;
    if (l.status === "disqualified") s.disqualified++;
    else s.leads++; // disqualified leads excluded from the active lead count (FRD-04)
  }
  for (const iv of (ivRes.data ?? []) as any[]) { const s = get(iv.owner_bd_id); if (s) s.interviews++; }
  for (const a of (asRes.data ?? []) as any[]) { const s = get(a.owner_bd_id); if (s) s.assessments++; }

  // Deals carry no owner_bd_id — attribute via their lead's owner. Deals are admin-only (RLS).
  if (canSeeDeals) {
    const { data: deals } = await supabase.from("deals").select("lead:leads(owner_bd_id)");
    for (const d of (deals ?? []) as any[]) { const s = get(d.lead?.owner_bd_id); if (s) s.deals++; }
  }

  const ids = Array.from(stats.keys());
  const { data: names } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] as any[] };
  const nameOf = (id: string) => (names ?? []).find((n: any) => n.id === id)?.full_name ?? "—";

  const score = (s: Stat) => s.leads + s.interviews + s.assessments + s.deals;
  const rows = ids
    .map((id) => ({ id, name: nameOf(id), ...stats.get(id)! }))
    .sort((a, b) => score(b) - score(a));

  return (
    <Card>
      <CardHeader>
        <CardTitle>BD Performance</CardTitle>
        <CardDescription>
          Activity per Business Developer. The lead count excludes disqualified leads (shown separately).
          {canSeeDeals ? "" : " You see your own numbers."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>BD</TH><TH>Leads</TH><TH>Disqualified</TH><TH>Interviews</TH><TH>Assessments</TH>
              {canSeeDeals && <TH>Deals</TH>}
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">{r.name}</TD>
                <TD className="tabular">{r.leads}</TD>
                <TD className="tabular text-text-secondary">{r.disqualified}</TD>
                <TD className="tabular">{r.interviews}</TD>
                <TD className="tabular">{r.assessments}</TD>
                {canSeeDeals && <TD className="tabular">{r.deals}</TD>}
              </TR>
            ))}
            {rows.length === 0 && (
              <TR><TD colSpan={canSeeDeals ? 6 : 5} className="py-6 text-center text-text-secondary">No activity yet.</TD></TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
