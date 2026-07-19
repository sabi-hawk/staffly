import Link from "next/link";
import { ArrowLeft, Clock, TrendingDown, CalendarCheck, CalendarX, Plane, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { resolveRange, type RangeKey } from "@/lib/time";
import { buildEmployeeReport } from "@/lib/services/reports";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { EmployeeAttendanceTable } from "@/components/admin/employee-attendance-table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { EmployeeEditor } from "@/components/admin/employee-editor";
import { PrivateEditor } from "@/components/admin/private-editor";
import { ShiftEditor } from "@/components/admin/shift-editor";
import { CompensationEditor } from "@/components/admin/compensation-editor";
import { CredentialsCard } from "@/components/admin/credentials-card";
import { ProfileFlags } from "@/components/admin/profile-flags";
import { RoleAssign } from "@/components/admin/role-assign";
import { CommissionEditor } from "@/components/admin/commission-editor";
import { DealCommissionEditor } from "@/components/admin/deal-commission-editor";
import { RangeTabs } from "@/components/range-tabs";
import { formatHours, formatPKR, formatCode, ageFromDob, formatTime12, formatCrmDatetime } from "@/lib/utils";

export default async function EmployeeDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const viewer = (await getCurrentProfile())!;
  const superAdmin = hasPermP(viewer, PERM.compensationManage); // comp + commission + PII sections
  const adminViewer = hasPermP(viewer, PERM.employeesCredentials); // credentials + flags cards
  const supabase = createClient();

  const { data: p } = await supabase.from("profiles").select("*").eq("id", params.id).single();
  if (!p) return <p className="text-text-secondary">Employee not found.</p>;
  const isBD = (p.department ?? "").toLowerCase().includes("business");
  // Deal commissions apply to a BD OR to a developer assigned to a deal (basic salary + a deal cut).
  const canHaveDealCommission = isBD || !!p.is_developer || !!p.is_designer || !!p.is_deal_developer || !!p.is_closer;

  const { data: shift } = await supabase
    .from("shifts").select("*").eq("employee_id", params.id).eq("is_active", true).maybeSingle();

  const { from, to, range } = resolveRange(searchParams.range as RangeKey, searchParams.from, searchParams.to);
  const report = await buildEmployeeReport(supabase, params.id, from, to);

  // credentials are visible to admin + super admin
  const creds = adminViewer
    ? (await supabase.from("employee_credentials").select("*").eq("employee_id", params.id).maybeSingle()).data
    : null;

  let salary = null;
  let comps: any[] = [];
  let priv = null;
  let policies: any[] = [];
  let dealCommissions: any[] = [];
  let dealOpts: { id: string; label: string }[] = [];
  if (superAdmin) {
    salary = (await supabase.from("salary_structures").select("*").eq("employee_id", params.id).eq("is_active", true).maybeSingle()).data;
    comps = (await supabase.from("compensation_components").select("*").eq("employee_id", params.id).eq("is_active", true).order("created_at")).data ?? [];
    priv = (await supabase.from("employee_private").select("*").eq("employee_id", params.id).maybeSingle()).data;
    // Newest policy first (the one in effect); ones without a date fall to the bottom.
    policies = (await supabase.from("commission_policies").select("*").eq("employee_id", params.id).order("effective_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false })).data ?? [];
    if (canHaveDealCommission) {
      dealCommissions = (await supabase.from("deal_commissions").select("id, deal_id, rate, fixed_amount, label, deal:deals(name, deal_code, designation, owner_bd_id, secondary_owner_bd_id, closer_id, lead:leads(company), profile:dev_profiles(id, name, profile_no, email, color, stack:dev_stacks(name, color)))").eq("employee_id", params.id).order("created_at")).data ?? [];
      // Only the deals this person is actually on: primary/secondary BD owner, the CLOSER, or a working member.
      const ddRows = (await supabase.from("deal_developers").select("deal_id").eq("developer_id", params.id)).data ?? [];
      const memberDealIds = Array.from(new Set(ddRows.map((r: any) => r.deal_id)));
      const orParts = [`owner_bd_id.eq.${params.id}`, `secondary_owner_bd_id.eq.${params.id}`, `closer_id.eq.${params.id}`];
      if (memberDealIds.length) orParts.push(`id.in.(${memberDealIds.join(",")})`);
      const dealRows = (await supabase.from("deals").select("id, name, designation, deal_code, lead:leads(company), profile:dev_profiles(name, email, color, stack:dev_stacks(name))").or(orParts.join(",")).order("created_at", { ascending: false })).data ?? [];
      dealOpts = dealRows.map((d: any) => {
        const company = d.name || d.lead?.company || "Deal";
        // Rich two-line card: "Company · Designation · #code" over "Profile name · stack · email" so two
        // deals for the same company/designation are told apart by their profile, not just the number.
        const profileBits = [d.profile?.name, d.profile?.stack?.name, d.profile?.email].filter(Boolean).join(" · ");
        return {
          id: d.id,
          label: `${company}${d.designation ? ` · ${d.designation}` : ""} · #${d.deal_code}`,
          sublabel: profileBits || undefined,
          color: d.profile?.color ?? undefined,
        };
      });
    }
  }

  // RBAC role assignment (users.assign_roles — super-admin by default)
  const canAssignRole = hasPermP(viewer, PERM.usersAssignRoles);
  const allRoles = canAssignRole
    ? ((await supabase.from("app_roles").select("id, key, name, description").order("is_system", { ascending: false }).order("name")).data ?? [])
    : [];

  return (
    <div className="space-y-6">
      <Link href="/admin/employees" className="inline-flex items-center gap-1.5 text-caption font-medium text-text-secondary hover:text-brand-primary">
        <ArrowLeft className="size-4" /> Back to employees
      </Link>

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

      {/* Login credentials (admin + super admin) */}
      {adminViewer && (
        <Card>
          <CardHeader>
            <CardTitle>Login credentials</CardTitle>
            <CardDescription>Employee signs in at /login with their username. Copy to share securely.</CardDescription>
          </CardHeader>
          <CardContent>
            <CredentialsCard employeeId={p.id} fullName={p.full_name} username={p.username} password={creds?.portal_password ?? null} />
          </CardContent>
        </Card>
      )}

      {/* Role (RBAC, FRD-08) — decides every permission. Assignment = users.assign_roles (super). */}
      {canAssignRole && (
        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
            <CardDescription>The role decides what this person can see and do (nav, pages, data). Manage the roles themselves under Roles &amp; permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <RoleAssign employeeId={p.id} roles={allRoles as any} currentRoleId={p.app_role_id} />
          </CardContent>
        </Card>
      )}

      {/* Shift (after Role) — collapsible */}
      <CollapsibleCard title="Shift" defaultOpen={false}>
        <ShiftEditor employeeId={p.id} shift={shift} />
      </CollapsibleCard>

      {/* Compensation (super admin only) — after Role, collapsible */}
      {superAdmin && (
        <CollapsibleCard
          title="Compensation"
          description={`Base salary ${formatPKR(salary?.base_salary ?? 0)} · additional categories below`}
          defaultOpen={false}
        >
          <CompensationEditor employeeId={p.id} components={comps} baseSalary={Number(salary?.base_salary ?? 0)} />
        </CollapsibleCard>
      )}

      {/* Commission policy (BD employees, super admin only) */}
      {superAdmin && isBD && (
        <CollapsibleCard title="Commission policy" description="Percentage commitments for this business-development employee." defaultOpen={false}>
          <CommissionEditor employeeId={p.id} policies={policies} />
        </CollapsibleCard>
      )}

      {/* Deal commissions (BD or a deal-assigned developer, super admin only) — % of a deal's receipts
          or a fixed amount, added to the payslip when payroll is generated. */}
      {superAdmin && canHaveDealCommission && (
        <CollapsibleCard title="Deal commissions" description="Pay a % of a deal's monthly receipts (or a fixed amount) on top of the base salary. It lands on the payslip automatically." defaultOpen={false}>
          <DealCommissionEditor employeeId={p.id} commissions={dealCommissions} deals={dealOpts} />
        </CollapsibleCard>
      )}

      {/* Capability flags (admin + super admin) — collapsible */}
      {adminViewer && (
        <CollapsibleCard
          title="Flags"
          description="Developer (assignable in pickers) / BD-Lead / deal-assigned. Assigning a role syncs the BD-Lead and deal-assigned flags automatically."
          defaultOpen={false}
        >
          <ProfileFlags employeeId={p.id} initial={{ is_developer: p.is_developer, is_designer: p.is_designer, is_bd_lead: p.is_bd_lead, is_deal_developer: p.is_deal_developer, is_closer: p.is_closer, payroll_exempt: p.payroll_exempt }} />
        </CollapsibleCard>
      )}

      {/* Attendance summary with range — collapsible + paginated */}
      <CollapsibleCard title="Attendance summary" action={<RangeTabs range={range} from={from} to={to} />} defaultOpen={false}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard label="Total hours" value={formatHours(report.totalHours)} icon={Clock} />
            <StatCard label="Deficit" value={formatHours(report.totalDeficitHours)} icon={TrendingDown} tone="danger" />
            <StatCard label="Extra" value={formatHours(report.totalExtraHours)} icon={TrendingUp} tone="success" />
            <StatCard label="Days worked" value={`${report.daysWorked}/${report.workingDays}`} icon={CalendarCheck} tone="brand" />
            <StatCard label="Leaves" value={report.leaveDays} icon={Plane} tone="neutral" />
            <StatCard label="Missing" value={report.missingDays} icon={CalendarX} tone="warning" />
          </div>
          <EmployeeAttendanceTable daily={report.daily} />
        </div>
      </CollapsibleCard>

      {/* Editable details — CNIC is rendered inline here for a super admin (saved to employee_private) */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Edit profile details</CardDescription>
        </CardHeader>
        <CardContent><EmployeeEditor profile={p} cnic={priv?.cnic ?? null} canEditPrivate={superAdmin} /></CardContent>
      </Card>

      {/* Bank details (super admin only) — CNIC lives in its own card higher up */}
      {superAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Bank details</CardTitle>
            <CardDescription>Account and IBAN for salary payment. Visible to the employee and super admin only.</CardDescription>
          </CardHeader>
          <CardContent><PrivateEditor employeeId={p.id} data={priv} only="bank" /></CardContent>
        </Card>
      )}
    </div>
  );
}
