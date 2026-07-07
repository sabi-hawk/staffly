import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { karachiMidnightISO } from "@/lib/time";
import type { AuditLog } from "@/lib/types";
import { LogsTable } from "@/components/admin/logs-table";
import { LogFilters } from "@/components/admin/log-filters";
import { FilterShell } from "@/components/crm/filter-shell";
import { LoginPager } from "@/components/admin/login-pager";
import { entityLabel } from "@/lib/audit/labels";

const ENTITIES = ["profiles", "attendance", "leave_requests", "salary_structures",
  "compensation_components", "payroll_runs", "payslip_components", "shifts",
  "departments", "dev_stacks", "dev_profiles", "dev_profile_documents",
  "leads", "interviews", "assessments", "assessment_documents",
  "deals", "deal_documents", "receiving_accounts", "payment_methods"];
const ACTIONS = ["insert", "update", "delete", "download"];
const LOGIN_PAGE_SIZE = 15;

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string; entity?: string; action?: string; actor?: string; from?: string; to?: string; lpage?: string };
}) {
  const viewer = await getCurrentProfile();
  if (!viewer || !(hasPermP(viewer, PERM.activityViewOps) || hasPermP(viewer, PERM.activityViewFinancial))) redirect("/admin/dashboard");
  const supabase = createClient();
  const { page, pageSize, from: rangeFrom, to: rangeTo } = parsePaging(searchParams);

  // RLS scopes rows: super-admin all; admin/BD-Lead non-financial; BD their own CRM records.
  let q = supabase.from("audit_log").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(rangeFrom, rangeTo);
  if (searchParams.entity) q = q.eq("entity", searchParams.entity);
  if (searchParams.action) q = q.eq("action", searchParams.action);
  if (searchParams.actor) q = q.ilike("actor_email", `%${searchParams.actor}%`);
  if (searchParams.from) q = q.gte("created_at", karachiMidnightISO(searchParams.from));
  if (searchParams.to) q = q.lte("created_at", new Date(`${searchParams.to}T23:59:59+05:00`).toISOString());
  const { data: logs, count } = await q;

  const superAdmin = hasPermP(viewer, PERM.activityViewFinancial);
  const loginPage = Math.max(1, Number(searchParams.lpage) || 1);
  const loginFrom = (loginPage - 1) * LOGIN_PAGE_SIZE;
  const { data: logins, count: loginCount } = superAdmin
    ? await supabase.from("login_events").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(loginFrom, loginFrom + LOGIN_PAGE_SIZE - 1)
    : { data: [], count: 0 };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Every change on the platform: who, when, and what changed{superAdmin ? "" : " (payroll and financial entries are super-admin only)"}.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <FilterShell
            toolbar={
              <div className="mb-4">
                <LogFilters
                  entities={ENTITIES.map((e) => ({ value: e, label: entityLabel(e) }))}
                  actions={ACTIONS.map((a) => ({ value: a, label: a }))}
                  initial={{ entity: searchParams.entity ?? "", action: searchParams.action ?? "", actor: searchParams.actor ?? "", from: searchParams.from ?? "", to: searchParams.to ?? "" }}
                />
              </div>
            }
          >
            <LogsTable rows={(logs ?? []) as AuditLog[]} />
            <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
          </FilterShell>
        </CardContent>
      </Card>

      {superAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Login activity</CardTitle>
            <CardDescription>IP and device captured at sign-in (a browser can&apos;t expose a hardware MAC address).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>When</TH><TH>User</TH><TH>IP</TH><TH>Device / user agent</TH></TR></THead>
              <TBody>
                {(logins ?? []).map((l) => (
                  <TR key={l.id}>
                    <TD className="tabular text-caption">{new Date(l.created_at).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}</TD>
                    <TD>{l.email ?? "—"}</TD>
                    <TD className="tabular">{l.ip_address ?? "—"}</TD>
                    <TD className="max-w-[420px] truncate text-caption text-text-secondary">{l.user_agent ?? "—"}</TD>
                  </TR>
                ))}
                {(logins ?? []).length === 0 && <TR><TD colSpan={4} className="py-6 text-center text-text-secondary">No logins recorded yet.</TD></TR>}
              </TBody>
            </Table>
            <LoginPager page={loginPage} pageSize={LOGIN_PAGE_SIZE} total={loginCount ?? 0} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
