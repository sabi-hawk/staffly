import { Clock, TrendingDown, CalendarCheck, CalendarX, Plane, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { resolveRange, type RangeKey } from "@/lib/time";
import { buildEmployeeReport } from "@/lib/services/reports";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { EmployeeEditor } from "@/components/admin/employee-editor";
import { ShiftEditor } from "@/components/admin/shift-editor";
import { CompensationEditor } from "@/components/admin/compensation-editor";
import { RangeTabs } from "@/components/range-tabs";
import { formatHours, formatPKR, formatCode, ageFromDob, formatTime12 } from "@/lib/utils";

export default async function EmployeeDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const viewer = (await getCurrentProfile())!;
  const superAdmin = isSuperAdmin(viewer.role);
  const supabase = createClient();

  const { data: p } = await supabase.from("profiles").select("*").eq("id", params.id).single();
  if (!p) return <p className="text-text-secondary">Employee not found.</p>;

  const { data: shift } = await supabase
    .from("shifts").select("*").eq("employee_id", params.id).eq("is_active", true).maybeSingle();

  const { from, to, range } = resolveRange(searchParams.range as RangeKey, searchParams.from, searchParams.to);
  const report = await buildEmployeeReport(supabase, params.id, from, to);

  let salary = null;
  let comps: any[] = [];
  if (superAdmin) {
    salary = (await supabase.from("salary_structures").select("*").eq("employee_id", params.id).eq("is_active", true).maybeSingle()).data;
    comps = (await supabase.from("compensation_components").select("*").eq("employee_id", params.id).eq("is_active", true).order("created_at")).data ?? [];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-5">
          <AvatarUpload current={p.avatar_url} gender={p.gender} employeeId={p.id} size={72} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-h1 text-text-primary">{p.full_name}</h2>
              <Badge tone="neutral">{formatCode(p.employee_code)}</Badge>
              <Badge tone={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge>
            </div>
            <p className="text-caption text-text-secondary">
              {p.position} · {p.department} · <span className="capitalize">{p.employment_type}</span>
              {p.date_of_birth && ` · Age ${ageFromDob(p.date_of_birth)}`}
              {shift && ` · Shift ${formatTime12(shift.start_time)}–${formatTime12(shift.end_time)}`}
            </p>
            <p className="text-caption text-text-secondary">
              {p.email}{p.email_secondary ? ` · ${p.email_secondary}` : ""}{p.phone ? ` · ${p.phone}` : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Attendance summary with range */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Attendance summary</CardTitle>
          <RangeTabs range={range} from={from} to={to} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard label="Total hours" value={formatHours(report.totalHours)} icon={Clock} />
            <StatCard label="Deficit" value={formatHours(report.totalDeficitHours)} icon={TrendingDown} tone="danger" />
            <StatCard label="Extra" value={formatHours(report.totalExtraHours)} icon={TrendingUp} tone="success" />
            <StatCard label="Days worked" value={`${report.daysWorked}/${report.workingDays}`} icon={CalendarCheck} tone="brand" />
            <StatCard label="Leaves" value={report.leaveDays} icon={Plane} tone="neutral" />
            <StatCard label="Missing" value={report.missingDays} icon={CalendarX} tone="warning" />
          </div>
          <Table>
            <THead><TR><TH>Date</TH><TH>Hours</TH><TH>Deficit/Extra</TH></TR></THead>
            <TBody>
              {report.daily.slice(-15).reverse().map((r: any) => (
                <TR key={r.work_date}>
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

      {/* Shift */}
      <Card>
        <CardHeader><CardTitle>Shift</CardTitle></CardHeader>
        <CardContent><ShiftEditor employeeId={p.id} shift={shift} /></CardContent>
      </Card>

      {/* Compensation (super admin only) */}
      {superAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Compensation</CardTitle>
            <CardDescription>Base salary {formatPKR(salary?.base_salary ?? 0)} · additional categories below</CardDescription>
          </CardHeader>
          <CardContent>
            <CompensationEditor employeeId={p.id} components={comps} />
          </CardContent>
        </Card>
      )}

      {/* Editable details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>{superAdmin ? "Edit profile, bank & account details" : "Edit profile details"}</CardDescription>
        </CardHeader>
        <CardContent><EmployeeEditor profile={p} canSeeBank={superAdmin} /></CardContent>
      </Card>
    </div>
  );
}
