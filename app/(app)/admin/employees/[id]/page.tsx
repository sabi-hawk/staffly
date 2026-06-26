import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatHours, formatPKR } from "@/lib/utils";

export default async function EmployeeDetail({ params }: { params: { id: string } }) {
  const viewer = (await getCurrentProfile())!;
  const supabase = createClient();

  const { data: p } = await supabase.from("profiles").select("*").eq("id", params.id).single();
  if (!p) return <p className="text-text-secondary">Employee not found.</p>;

  const { data: shift } = await supabase
    .from("shifts").select("*").eq("employee_id", params.id).eq("is_active", true).maybeSingle();
  const { data: att } = await supabase
    .from("attendance").select("*").eq("employee_id", params.id).order("work_date", { ascending: false }).limit(10);

  // Salary only visible to super_admin (RLS would block others anyway)
  let salary = null;
  if (isSuperAdmin(viewer.role)) {
    const { data } = await supabase.from("salary_structures").select("*").eq("employee_id", params.id).eq("is_active", true).maybeSingle();
    salary = data;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{p.full_name}</CardTitle>
          <CardDescription>{p.position} · {p.department} · {p.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
          <div><span className="text-text-secondary">Type</span><div className="capitalize">{p.employment_type}</div></div>
          <div><span className="text-text-secondary">Joined</span><div className="tabular">{p.joining_date ?? "—"}</div></div>
          <div><span className="text-text-secondary">Shift</span><div className="tabular">{shift ? `${shift.start_time}–${shift.end_time}` : "—"}</div></div>
        </CardContent>
      </Card>

      {salary && (
        <Card>
          <CardHeader><CardTitle>Compensation (Super Admin)</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
            <div><span className="text-text-secondary">Type</span><div className="capitalize">{salary.type.replace(/_/g, " ")}</div></div>
            <div><span className="text-text-secondary">Base</span><div className="tabular">{formatPKR(salary.base_salary)}</div></div>
            <div><span className="text-text-secondary">OT rate</span><div className="tabular">{formatPKR(salary.overtime_rate_hour)}/h</div></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Recent attendance</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Date</TH><TH>Hours</TH><TH>Deficit/Extra</TH></TR></THead>
            <TBody>
              {(att ?? []).map((r) => (
                <TR key={r.id}>
                  <TD className="tabular">{r.work_date}</TD>
                  <TD className="tabular">{formatHours(r.total_hours)}</TD>
                  <TD>
                    {Number(r.deficit_hours) > 0 && <Badge tone="danger">-{formatHours(r.deficit_hours)}</Badge>}
                    {Number(r.extra_hours) > 0 && <Badge tone="success">+{formatHours(r.extra_hours)}</Badge>}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
