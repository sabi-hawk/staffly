import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/crm/access";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";

export default async function CrmProfilesPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string };
}) {
  const me = await getCurrentProfile();
  const canManage = isAdminRole(me?.role);
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);

  // RLS scopes the rows: admins/BD-Leads see all; a plain BD sees only profiles they own.
  const { data: rows, count } = await supabase
    .from("dev_profiles")
    .select("id, name, email, mobile, status, stack:dev_stacks(name), owner:profiles(full_name)", {
      count: "exact",
    })
    .order("name", { ascending: true })
    .range(from, to);

  type Row = {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
    status: string;
    stack: { name: string } | null;
    owner: { full_name: string } | null;
  };
  // Supabase infers embedded to-one relations as arrays; at runtime they're single objects.
  const list = (rows ?? []) as unknown as Row[];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>CRM Profiles ({count ?? 0})</CardTitle>
        {canManage && (
          <Button asChild size="sm">
            <Link href="/crm/profiles/new"><Plus className="size-4" /> Add profile</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>Name</TH><TH>Stack</TH><TH>Owner (BD)</TH><TH>Email</TH><TH>Mobile</TH><TH>Status</TH><TH></TH>
            </TR>
          </THead>
          <TBody>
            {list.map((p) => (
              <TR key={p.id} className="cursor-pointer">
                <TD>
                  <Link href={`/crm/profiles/${p.id}`} className="font-medium text-text-primary hover:text-brand-primary">
                    {p.name}
                  </Link>
                </TD>
                <TD>{p.stack?.name ?? "—"}</TD>
                <TD>{p.owner?.full_name ?? <span className="text-text-secondary">Unassigned</span>}</TD>
                <TD className="text-text-secondary">{p.email ?? "—"}</TD>
                <TD className="text-text-secondary">{p.mobile ?? "—"}</TD>
                <TD><Badge tone={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge></TD>
                <TD className="text-right">
                  <Link href={`/crm/profiles/${p.id}`} className="inline-flex text-text-secondary hover:text-brand-primary" aria-label="Open">
                    <ChevronRight className="size-4" />
                  </Link>
                </TD>
              </TR>
            ))}
            {list.length === 0 && (
              <TR><TD colSpan={7} className="py-6 text-center text-text-secondary">No profiles yet.</TD></TR>
            )}
          </TBody>
        </Table>
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
      </CardContent>
    </Card>
  );
}
