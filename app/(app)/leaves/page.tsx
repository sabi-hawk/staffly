import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { leaveSummary } from "@/lib/services/leaves";
import { LeaveApplyForm } from "@/components/leaves/apply-form";
import { CancelLeaveButton } from "@/components/leaves/cancel-button";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

const tone = (s: string) =>
  s === "approved" ? "success" : s === "pending" ? "warning" : s === "rejected" ? "danger" : "neutral";

export default async function LeavesPage() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const summary = await leaveSummary(supabase, profile.id);

  const { data: requests } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", profile.id)
    .order("start_date", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Annual remaining" value={summary.annualRemaining} icon={CalendarDays} />
        <StatCard label="Casual this month" value={summary.casualRemaining} icon={CalendarDays} tone="success" />
        <StatCard label="Unpaid taken (yr)" value={summary.unpaidUsed} icon={CalendarDays} tone="warning" />
      </div>

      <LeaveApplyForm />

      <Card>
        <CardHeader>
          <CardTitle>My requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Type</TH><TH>From</TH><TH>To</TH><TH>Days</TH><TH>Status</TH><TH>Reason</TH><TH></TH>
              </TR>
            </THead>
            <TBody>
              {(requests ?? []).map((r) => (
                <TR key={r.id}>
                  <TD className="capitalize">{r.type}</TD>
                  <TD className="tabular">{r.start_date}</TD>
                  <TD className="tabular">{r.end_date}</TD>
                  <TD className="tabular">{r.days_count}</TD>
                  <TD><Badge tone={tone(r.status) as any}>{r.status}</Badge></TD>
                  <TD className="text-text-secondary">{r.reason ?? "—"}</TD>
                  <TD>{r.status === "pending" && <CancelLeaveButton id={r.id} />}</TD>
                </TR>
              ))}
              {(requests ?? []).length === 0 && (
                <TR><TD className="py-6 text-center text-text-secondary">No leave requests yet.</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
