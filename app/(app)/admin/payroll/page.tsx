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
  const { data: people } = await supabase.from("profiles").select("id, full_name");
  const names = Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-h1 text-text-primary">Payroll</h2>
        <p className="text-caption text-text-secondary">Super Admin only · salary & compensation</p>
      </div>
      <PayrollClient initialRuns={runs ?? []} defaultFrom={from} defaultTo={to} names={names} />
    </div>
  );
}
