import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LeaveActions } from "@/components/admin/leave-actions";
import { AddLeave } from "@/components/admin/add-leave";
import { formatCode } from "@/lib/utils";

const tone = (s: string) =>
  s === "approved" ? "success" : s === "pending" ? "warning" : s === "rejected" ? "danger" : "neutral";

export default async function AdminLeavesPage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("leave_requests")
    .select("*, profiles!leave_requests_employee_id_fkey(full_name, employee_code)")
    .order("status", { ascending: true })
    .order("start_date", { ascending: false });
  const { data: employees } = await supabase
    .from("profiles").select("id, full_name, employee_code").eq("role", "employee").order("full_name");

  const pending = (rows ?? []).filter((r) => r.status === "pending");
  const decided = (rows ?? []).filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add / convert leave</CardTitle>
          <CardDescription>Record a leave for an employee — also used to convert a missing day into casual / unpaid / paid.</CardDescription>
        </CardHeader>
        <CardContent><AddLeave employees={employees ?? []} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Approval queue ({pending.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Code</TH><TH>Employee</TH><TH>Type</TH><TH>From</TH><TH>To</TH><TH>Days</TH><TH>Reason</TH><TH>Action</TH></TR></THead>
            <TBody>
              {pending.map((r: any) => (
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
              {pending.length === 0 && <TR><TD className="py-6 text-center text-text-secondary">Queue is empty 🎉</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Decided</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Code</TH><TH>Employee</TH><TH>Type</TH><TH>From</TH><TH>To</TH><TH>Days</TH><TH>Status</TH></TR></THead>
            <TBody>
              {decided.map((r: any) => (
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
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
