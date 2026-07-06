import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LeaveActions } from "@/components/admin/leave-actions";
import { AddLeave } from "@/components/admin/add-leave";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { formatCode } from "@/lib/utils";

const tone = (s: string) =>
  s === "approved" ? "success" : s === "pending" ? "warning" : s === "rejected" ? "danger" : "neutral";

export default async function AdminLeavesPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string };
}) {
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);

  // pending queue (all) + paginated decided history
  const { data: pending } = await supabase
    .from("leave_requests")
    .select("*, profiles!leave_requests_employee_id_fkey(full_name, employee_code)")
    .eq("status", "pending")
    .order("start_date", { ascending: false });
  const { data: decided, count: decidedCount } = await supabase
    .from("leave_requests")
    .select("*, profiles!leave_requests_employee_id_fkey(full_name, employee_code)", { count: "exact" })
    .neq("status", "pending")
    .order("start_date", { ascending: false })
    .range(from, to);
  const { data: employees } = await supabase
    .from("profiles").select("id, full_name, employee_code").eq("role", "employee").order("full_name");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add / convert leave</CardTitle>
          <CardDescription>Record a leave for an employee. Also converts a missing day into casual, unpaid or paid.</CardDescription>
        </CardHeader>
        <CardContent><AddLeave employees={employees ?? []} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Approval queue ({(pending ?? []).length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Code</TH><TH>Employee</TH><TH>Type</TH><TH>From</TH><TH>To</TH><TH>Days</TH><TH>Reason</TH><TH>Action</TH></TR></THead>
            <TBody>
              {(pending ?? []).map((r: any) => (
                <TR key={r.id}>
                  <TD className="tabular text-text-secondary">{formatCode(r.profiles?.employee_code)}</TD>
                  <TD>{r.profiles?.full_name}</TD>
                  <TD className="capitalize">{r.type}</TD>
                  <TD className="tabular">{r.start_date}</TD>
                  <TD className="tabular">{r.end_date}</TD>
                  <TD className="tabular">{r.days_count}</TD>
                  <TD className="text-text-secondary">{r.reason ?? "—"}</TD>
                  <TD><LeaveActions id={r.id} /></TD>
                </TR>
              ))}
              {(pending ?? []).length === 0 && <TR><TD className="py-6 text-center text-text-secondary">Queue is empty 🎉</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Decided ({decidedCount ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Code</TH><TH>Employee</TH><TH>Type</TH><TH>From</TH><TH>To</TH><TH>Days</TH><TH>Status</TH></TR></THead>
            <TBody>
              {(decided ?? []).map((r: any) => (
                <TR key={r.id}>
                  <TD className="tabular text-text-secondary">{formatCode(r.profiles?.employee_code)}</TD>
                  <TD>{r.profiles?.full_name}</TD>
                  <TD className="capitalize">{r.type}</TD>
                  <TD className="tabular">{r.start_date}</TD>
                  <TD className="tabular">{r.end_date}</TD>
                  <TD className="tabular">{r.days_count}</TD>
                  <TD><Badge tone={tone(r.status) as any}>{r.status}</Badge></TD>
                </TR>
              ))}
              {(decided ?? []).length === 0 && <TR><TD className="py-6 text-center text-text-secondary">No decided leaves yet.</TD></TR>}
            </TBody>
          </Table>
          <Pagination total={decidedCount ?? 0} page={page} pageSize={pageSize} />
        </CardContent>
      </Card>
    </div>
  );
}
