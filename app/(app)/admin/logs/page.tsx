import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { LogsTable } from "@/components/admin/logs-table";

const ENTITIES = ["all", "profiles", "attendance", "leave_requests", "salary_structures",
  "compensation_components", "payroll_runs", "payslip_components", "shifts"];

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string; entity?: string };
}) {
  const viewer = (await getCurrentProfile())!;
  if (!isSuperAdmin(viewer.role)) redirect("/admin/dashboard");
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);
  const entity = searchParams.entity || "all";

  let q = supabase.from("audit_log").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (entity !== "all") q = q.eq("entity", entity);
  const { data: logs, count } = await q;

  const { data: logins } = await supabase
    .from("login_events").select("*").order("created_at", { ascending: false }).limit(15);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Activity logs</CardTitle>
            <CardDescription>Every change made on the platform — who, when, and what changed.</CardDescription>
          </div>
          <form>
            <select name="entity" defaultValue={entity} className="h-9 rounded-md border border-border bg-white px-3 text-sm">
              {ENTITIES.map((e) => <option key={e} value={e}>{e === "all" ? "All entities" : e}</option>)}
            </select>
            <noscript><button type="submit" className="ml-2">Filter</button></noscript>
          </form>
        </CardHeader>
        <CardContent>
          <EntityFilterScript />
          <LogsTable rows={(logs ?? []) as any} />
          <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login activity</CardTitle>
          <CardDescription>IP address &amp; device captured at sign-in (a browser can't expose a hardware MAC address).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>When</TH><TH>User</TH><TH>IP</TH><TH>Device / user agent</TH></TR></THead>
            <TBody>
              {(logins ?? []).map((l) => (
                <TR key={l.id}>
                  <TD className="tabular text-caption">{new Date(l.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</TD>
                  <TD>{l.email ?? "—"}</TD>
                  <TD className="tabular">{l.ip_address ?? "—"}</TD>
                  <TD className="max-w-[420px] truncate text-caption text-text-secondary">{l.user_agent ?? "—"}</TD>
                </TR>
              ))}
              {(logins ?? []).length === 0 && <TR><TD className="py-6 text-center text-text-secondary">No logins recorded yet.</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/** Tiny progressive-enhancement: submit the entity filter form on change. */
function EntityFilterScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html:
          "document.addEventListener('change',function(e){if(e.target&&e.target.name==='entity'){e.target.form.requestSubmit?e.target.form.requestSubmit():e.target.form.submit();}});",
      }}
    />
  );
}
