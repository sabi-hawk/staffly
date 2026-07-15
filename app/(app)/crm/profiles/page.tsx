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
import { StatusPill } from "@/components/crm/status-pill";
import { ProfileRowActions } from "@/components/crm/profile-row-actions";
import { ColoredName, StackBadge } from "@/components/crm/crm-cells";
import { Pagination } from "@/components/ui/pagination";
import { CrmFilterBar } from "@/components/crm/filter-bar";
import { FilterShell } from "@/components/crm/filter-shell";
import { StacksManager } from "@/components/crm/stacks-manager";
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
    .select("id, profile_no, name, email, mobile, status, stack:dev_stacks(name, color), owner:profiles(full_name, color)", { count: "exact" });
  if (searchParams.owner) query = query.eq("owner_bd_id", searchParams.owner);
  if (searchParams.stack) query = query.eq("stack_id", searchParams.stack);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.q) {
    // a purely numeric search finds the profile by its number (#14), otherwise name/email
    if (/^\d+$/.test(searchParams.q.trim())) query = query.eq("profile_no", Number(searchParams.q.trim()));
    else query = query.or(`name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%`);
  }
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
          <div className="flex items-center gap-2">
            <StacksManager />
            <Button asChild size="sm"><Link href="/crm/profiles/new"><Plus className="size-4" /> Add profile</Link></Button>
          </div>
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
                search={{ key: "q", placeholder: "Search name, email or #number" }}
              />
            </div>
          }
        >
        <Table>
          <THead>
            <TR><TH>#</TH><TH>Name</TH><TH>Email</TH><TH>Stack</TH><TH>Owner (BD)</TH><TH>Mobile</TH><TH>Status</TH><TH></TH></TR>
          </THead>
          <TBody>
            {list.map((p) => (
              <TR key={p.id}>
                <TD><span className="rounded bg-brand-light px-1.5 py-0.5 font-mono text-caption text-brand-primary">#{p.profile_no}</span></TD>
                <TD><Link href={`/crm/profiles/${p.id}`} className="font-medium text-text-primary hover:text-brand-primary">{p.name}</Link></TD>
                <TD className="text-text-secondary">{p.email ?? "—"}</TD>
                <TD><StackBadge name={p.stack?.name} color={p.stack?.color} /></TD>
                <TD>{p.owner?.full_name ? <ColoredName name={p.owner.full_name} color={p.owner.color} /> : <span className="text-text-secondary">Unassigned</span>}</TD>
                <TD className="text-text-secondary">{p.mobile ?? "—"}</TD>
                <TD><StatusPill status={p.status} /></TD>
                <TD>
                  {canManage
                    ? <ProfileRowActions profileId={p.id} name={p.name} />
                    : <Link href={`/crm/profiles/${p.id}`} className="flex justify-end" aria-label="Open"><ChevronRight className="size-4 text-text-secondary" /></Link>}
                </TD>
              </TR>
            ))}
            {list.length === 0 && <TR><TD colSpan={8} className="py-6 text-center text-text-secondary">No profiles match.</TD></TR>}
          </TBody>
        </Table>
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
        </FilterShell>
      </CardContent>
    </Card>
  );
}
