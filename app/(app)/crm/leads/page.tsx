import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { labelize, statusTone } from "@/lib/crm/constants";

export default async function CrmLeadsPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string };
}) {
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);

  const { data: rows, count } = await supabase
    .from("leads")
    .select(
      "id, company, role, status, profile:dev_profiles(name), owner:profiles!leads_owner_bd_id_fkey(full_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  type Row = {
    id: string; company: string; role: string | null; status: string;
    profile: { name: string } | null; owner: { full_name: string } | null;
  };
  const list = (rows ?? []) as unknown as Row[];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>CRM Leads ({count ?? 0})</CardTitle>
        <Button asChild size="sm"><Link href="/crm/leads/new"><Plus className="size-4" /> New lead</Link></Button>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR><TH>Company</TH><TH>Role</TH><TH>Profile</TH><TH>Owner (BD)</TH><TH>Status</TH><TH></TH></TR>
          </THead>
          <TBody>
            {list.map((l) => (
              <TR key={l.id}>
                <TD><Link href={`/crm/leads/${l.id}`} className="font-medium text-text-primary hover:text-brand-primary">{l.company}</Link></TD>
                <TD>{l.role ?? "—"}</TD>
                <TD>{l.profile?.name ?? "—"}</TD>
                <TD>{l.owner?.full_name ?? "—"}</TD>
                <TD><Badge tone={statusTone(l.status)}>{labelize(l.status)}</Badge></TD>
                <TD className="text-right"><Link href={`/crm/leads/${l.id}`} className="inline-flex text-text-secondary hover:text-brand-primary" aria-label="Open"><ChevronRight className="size-4" /></Link></TD>
              </TR>
            ))}
            {list.length === 0 && <TR><TD colSpan={6} className="py-6 text-center text-text-secondary">No leads yet.</TD></TR>}
          </TBody>
        </Table>
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
      </CardContent>
    </Card>
  );
}
