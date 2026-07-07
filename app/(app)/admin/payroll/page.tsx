import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { PayrollClient } from "@/components/admin/payroll-client";

export default async function PayrollPage() {
  const profile = (await getCurrentProfile())!;
  if (!hasPermP(profile, PERM.payrollView)) redirect("/admin/dashboard");

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

  // Saved compensation categories per employee — so the run's "Add line" can quick-add an occasional
  // (or variable) category (label + amount) instead of retyping. Occasional ones aren't auto-added.
  const { data: compRows } = await supabase
    .from("compensation_components").select("employee_id, label, amount, recurring, is_fixed_amount, description").eq("is_active", true);
  const compsByEmp: Record<string, { label: string; amount: number; recurring: boolean; is_fixed_amount: boolean; description: string | null }[]> = {};
  for (const c of compRows ?? []) (compsByEmp[c.employee_id] ??= []).push(c);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-h1 text-text-primary">Payroll</h2>
        <p className="text-caption text-text-secondary">Salary, payslips &amp; payments</p>
      </div>
      <PayrollClient
        initialRuns={runs ?? []}
        linesByRun={linesByRun}
        employees={employees}
        compsByEmp={compsByEmp}
        defaultFrom={from}
        defaultTo={to}
      />
    </div>
  );
}
