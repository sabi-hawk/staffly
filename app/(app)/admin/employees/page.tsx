import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function EmployeesPage() {
  const supabase = createClient();
  const { data: people } = await supabase
    .from("profiles").select("*").order("full_name");

  return (
    <Card>
      <CardHeader><CardTitle>Employees ({(people ?? []).length})</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <THead><TR><TH>Name</TH><TH>Role</TH><TH>Position</TH><TH>Department</TH><TH>Type</TH><TH>Status</TH></TR></THead>
          <TBody>
            {(people ?? []).map((p) => (
              <TR key={p.id}>
                <TD><Link className="text-brand-primary hover:underline" href={`/admin/employees/${p.id}`}>{p.full_name}</Link></TD>
                <TD className="capitalize">{p.role.replace("_", " ")}</TD>
                <TD>{p.position ?? "—"}</TD>
                <TD>{p.department ?? "—"}</TD>
                <TD className="capitalize">{p.employment_type}</TD>
                <TD><Badge tone={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
