import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { PayrollClient } from "@/components/admin/payroll-client";

export default async function PayrollPage() {
  const profile = (await getCurrentProfile())!;
  if (!isSuperAdmin(profile.role)) redirect("/admin/dashboard");

  const supabase = createClient();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: runs } = await supabase
    .from("payroll_runs").select("*").order("created_at", { ascending: false });

  const runIds = (runs ?? []).map((r) => r.id);
  const { data: lines } = runIds.length
    ? await supabase.from("payslip_components").select("*").in("payroll_run_id", runIds)
    : { data: [] as any[] };
  const linesByRun: Record<string, any[]> = {};
  for (const l of lines ?? []) (linesByRun[l.payroll_run_id] ??= []).push(l);

  const { data: empRows } = await supabase
    .from("profiles").select("id, full_name, employee_code").eq("role", "employee").order("full_name");
  const { data: privRows } = await supabase
    .from("employee_private").select("employee_id, bank_name, bank_account_number");
  const privById = new Map((privRows ?? []).map((p) => [p.employee_id, p]));
  const employees = (empRows ?? []).map((e) => ({
    ...e,
    bank_name: privById.get(e.id)?.bank_name ?? null,
    bank_account_number: privById.get(e.id)?.bank_account_number ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-h1 text-text-primary">Payroll</h2>
        <p className="text-caption text-text-secondary">Super Admin only · salary, payslips &amp; payments</p>
      </div>
      <PayrollClient
        initialRuns={runs ?? []}
        linesByRun={linesByRun}
        employees={employees}
        defaultFrom={from}
        defaultTo={to}
      />
    </div>
  );
}
