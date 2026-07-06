import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isAdminRole, isBdLead } from "@/lib/crm/access";
import { bdOptions } from "@/lib/crm/options";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { RowLink } from "@/components/ui/row-link";
import { StatusPill } from "@/components/crm/status-pill";
import { Pagination } from "@/components/ui/pagination";
import { CrmFilterBar } from "@/components/crm/filter-bar";
import { FilterShell } from "@/components/crm/filter-shell";
import { parsePaging } from "@/lib/pagination";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function CrmProfilesPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string; owner?: string; stack?: string; status?: string; q?: string };
}) {
  const me = await getCurrentProfile();
  const canManage = hasPermP(me, PERM.crmProfilesManage);
  // Only BD-Lead / admin / super may filter or assign by owner; a plain BD sees only their own (RLS).
  const canFilterOwner = canManage || (me ? isBdLead(me) : false);
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);

  // RLS scopes the rows: admins/BD-Leads see all; a plain BD sees only profiles they own.
  let query = supabase
    .from("dev_profiles")
    .select("id, name, email, mobile, status, stack:dev_stacks(name), owner:profiles(full_name)", { count: "exact" });
  if (searchParams.owner) query = query.eq("owner_bd_id", searchParams.owner);
  if (searchParams.stack) query = query.eq("stack_id", searchParams.stack);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.q) query = query.or(`name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%`);
  const { data: rows, count } = await query.order("name", { ascending: true }).range(from, to);

  const [bds, { data: stacks }] = await Promise.all([
    bdOptions(supabase),
    supabase.from("dev_stacks").select("id, name").eq("is_active", true).order("sort_order"),
  ]);
  const list = (rows ?? []) as any[];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>CRM Profiles ({count ?? 0})</CardTitle>
        {canManage && (
          <Button asChild size="sm"><Link href="/crm/profiles/new"><Plus className="size-4" /> Add profile</Link></Button>
        )}
      </CardHeader>
      <CardContent>
        <FilterShell
          toolbar={
            <div className="mb-4">
              <CrmFilterBar
                filters={[
                  ...(canFilterOwner ? [{ key: "owner", label: "Owner", options: bds.map((b) => ({ value: b.id, label: b.label })) }] : []),
                  { key: "stack", label: "Stack", options: (stacks ?? []).map((s: any) => ({ value: s.id, label: s.name })) },
                  { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
                ]}
                search={{ key: "q", placeholder: "Search name or email" }}
              />
            </div>
          }
        >
        <Table>
          <THead>
            <TR><TH>Name</TH><TH>Stack</TH><TH>Owner (BD)</TH><TH>Email</TH><TH>Mobile</TH><TH>Status</TH><TH></TH></TR>
          </THead>
          <TBody>
            {list.map((p) => (
              <RowLink key={p.id} href={`/crm/profiles/${p.id}`}>
                <TD><span className="font-medium text-text-primary">{p.name}</span></TD>
                <TD>{p.stack?.name ?? "—"}</TD>
                <TD>{p.owner?.full_name ?? <span className="text-text-secondary">Unassigned</span>}</TD>
                <TD className="text-text-secondary">{p.email ?? "—"}</TD>
                <TD className="text-text-secondary">{p.mobile ?? "—"}</TD>
                <TD><StatusPill status={p.status} /></TD>
                <TD className="text-right"><ChevronRight className="ml-auto size-4 text-text-secondary" /></TD>
              </RowLink>
            ))}
            {list.length === 0 && <TR><TD colSpan={7} className="py-6 text-center text-text-secondary">No profiles match.</TD></TR>}
          </TBody>
        </Table>
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
        </FilterShell>
      </CardContent>
    </Card>
  );
}
