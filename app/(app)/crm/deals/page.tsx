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
import { parsePaging } from "@/lib/pagination";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function CrmDealsPage({ searchParams }: { searchParams: { page?: string; pageSize?: string; status?: string; q?: string } }) {
  const me = await getCurrentProfile();
  if (!me || !hasPermP(me, PERM.dealsView)) redirect("/dashboard");
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);

  let query = supabase
    .from("deals")
    .select("id, deal_code, name, salary, currency, status, lead:leads(company), profile:dev_profiles(id, name, profile_no, email, stack:dev_stacks(name, color)), closer:profiles!deals_closer_id_fkey(full_name, color), deal_developers(role, dev:profiles!deal_developers_developer_id_fkey(id, full_name, color))", { count: "exact" });
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.q) query = query.ilike("name", `%${searchParams.q}%`);
  const { data: rows, count } = await query.order("created_at", { ascending: false }).range(from, to);
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
                filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "ended", label: "Ended" }, { value: "cancelled", label: "Cancelled" }] }]}
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
