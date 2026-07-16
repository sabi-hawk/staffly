import Link from "next/link";
import { ChevronRight, Plus, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { hasPermP } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { CrmFilterBar } from "@/components/crm/filter-bar";
import { FilterShell } from "@/components/crm/filter-shell";
import { DealsGrid } from "@/components/crm/deals-grid";
import { closerOptions, bdOptions, crmProfileOptions } from "@/lib/crm/options";
import { parsePaging } from "@/lib/pagination";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function CrmDealsPage({ searchParams }: { searchParams: { page?: string; pageSize?: string; status?: string; q?: string; closer?: string; profile?: string; owner?: string } }) {
  const me = await getCurrentProfile();
  if (!me || !hasPermP(me, PERM.dealsView)) redirect("/dashboard");
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);

  let query = supabase
    .from("deals")
    .select("id, deal_code, name, salary, currency, status, lead:leads(company), profile:dev_profiles(id, name, profile_no, email, color, stack:dev_stacks(name, color)), closer:profiles!deals_closer_id_fkey(full_name, color), owner_bd:profiles!deals_owner_bd_id_fkey(full_name, color), deal_developers(role, dev:profiles!deal_developers_developer_id_fkey(id, full_name, color))", { count: "exact" });
  // Default to ACTIVE deals; "all" is the explicit no-filter sentinel.
  const statusFilter = searchParams.status ?? "active";
  if (statusFilter !== "all") query = query.eq("status", statusFilter);
  if (searchParams.closer) query = query.eq("closer_id", searchParams.closer);
  if (searchParams.profile) query = query.eq("dev_profile_id", searchParams.profile);
  if (searchParams.owner) query = query.eq("owner_bd_id", searchParams.owner);
  if (searchParams.q) query = query.ilike("name", `%${searchParams.q}%`);
  const [{ data: rows, count }, closers, bds, profileOpts] = await Promise.all([
    query.order("created_at", { ascending: false }).range(from, to),
    closerOptions(supabase), bdOptions(supabase), crmProfileOptions(supabase),
  ]);
  // working devs (multi) = the `developer` rows of deal_developers, shown as chips
  const list = (rows ?? []).map((d: any) => ({
    ...d,
    developers: (d.deal_developers ?? []).filter((a: any) => a.role === "developer").map((a: any) => ({ id: a.dev?.id, full_name: a.dev?.full_name, color: a.dev?.color })),
  }));

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
        <FilterShell
          toolbar={
            <div className="mb-4">
              <CrmFilterBar
                filters={[
                  { key: "status", label: "Status", defaultValue: "active", options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "ended", label: "Ended" }, { value: "cancelled", label: "Cancelled" }] },
                  { key: "closer", label: "Closer", options: closers.map((c) => ({ value: c.id, label: c.label })) },
                  { key: "owner", label: "BD owner", options: bds.map((b) => ({ value: b.id, label: b.label })) },
                  { key: "profile", label: "Profile", options: profileOpts.map((p) => ({ value: p.id, label: p.label })) },
                ]}
                search={{ key: "q", placeholder: "Search company" }}
              />
            </div>
          }
        >
        <DealsGrid rows={list} />
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
        </FilterShell>
      </CardContent>
    </Card>
  );
}
