import { redirect } from "next/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { labelize, statusTone } from "@/lib/crm/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */
// HR/admin-safe directory of which developer is on which deal — NAME + assignment only (no financials),
// via the deal_directory() definer function. Full deal details stay super-admin only (0030).
export default async function DealAssignmentsPage() {
  const me = await getCurrentProfile();
  if (!me || !isAdmin(me.role)) redirect("/dashboard");
  const supabase = createClient();
  const { data } = await supabase.rpc("deal_directory");
  const rows = (data ?? []) as any[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal assignments</CardTitle>
        <CardDescription>Which developer is assigned to which client deal. Names only — deal financials are super-admin only.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR><TH>Deal</TH><TH>Developer</TH><TH>Role</TH><TH>Status</TH></TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={`${r.deal_id}-${r.developer_id}-${r.role}`}>
                <TD className="font-medium">{r.deal_name}</TD>
                <TD>{r.developer_name}</TD>
                <TD className="capitalize">{r.role}</TD>
                <TD><Badge tone={statusTone(r.status)}>{labelize(r.status)}</Badge></TD>
              </TR>
            ))}
            {rows.length === 0 && (
              <TR><TD colSpan={4} className="py-6 text-center text-text-secondary">No developers assigned to any deal yet.</TD></TR>
            )}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
