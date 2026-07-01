import Link from "next/link";
import { ChevronRight, Plus, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/crm/access";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { labelize, statusTone } from "@/lib/crm/constants";
import { formatPKR } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function CrmDealsPage({ searchParams }: { searchParams: { page?: string; pageSize?: string } }) {
  const me = await getCurrentProfile();
  if (!me || !isAdminRole(me.role)) redirect("/dashboard");
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);

  const { data: rows, count } = await supabase
    .from("deals")
    .select("id, designation, salary, status, joining_date, lead:leads(company), profile:dev_profiles(name), dev:profiles!deals_working_developer_fkey(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  const list = (rows ?? []) as any[];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Deals ({count ?? 0})</CardTitle>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline"><Link href="/crm/deals/settings"><Settings className="size-4" /> Accounts &amp; methods</Link></Button>
          <Button asChild size="sm"><Link href="/crm/deals/new"><Plus className="size-4" /> New deal</Link></Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR><TH>Company</TH><TH>Designation</TH><TH>Profile</TH><TH>Working dev</TH><TH>Salary</TH><TH>Joining</TH><TH>Status</TH><TH></TH></TR>
          </THead>
          <TBody>
            {list.map((d) => (
              <TR key={d.id}>
                <TD className="font-medium"><Link href={`/crm/deals/${d.id}`} className="text-text-primary hover:text-brand-primary">{d.lead?.company ?? "—"}</Link></TD>
                <TD>{d.designation ?? "—"}</TD>
                <TD>{d.profile?.name ?? "—"}</TD>
                <TD>{d.dev?.full_name ?? "—"}</TD>
                <TD>{d.salary != null ? formatPKR(d.salary) : "—"}</TD>
                <TD>{d.joining_date ?? "—"}</TD>
                <TD><Badge tone={statusTone(d.status)}>{labelize(d.status)}</Badge></TD>
                <TD className="text-right"><Link href={`/crm/deals/${d.id}`} className="inline-flex text-text-secondary hover:text-brand-primary" aria-label="Open"><ChevronRight className="size-4" /></Link></TD>
              </TR>
            ))}
            {list.length === 0 && <TR><TD colSpan={8} className="py-6 text-center text-text-secondary">No deals yet.</TD></TR>}
          </TBody>
        </Table>
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
      </CardContent>
    </Card>
  );
}
