import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/admin/print-button";
import { formatPKR, formatCode } from "@/lib/utils";

export default async function PayslipPage({ params }: { params: { runId: string } }) {
  const viewer = (await getCurrentProfile())!;
  if (!isSuperAdmin(viewer.role)) redirect("/admin/dashboard");
  const supabase = createClient();

  const { data: run } = await supabase.from("payroll_runs").select("*").eq("id", params.runId).single();
  if (!run) return <p className="text-text-secondary">Payslip not found.</p>;
  const { data: emp } = await supabase.from("profiles").select("*").eq("id", run.employee_id).single();
  const { data: priv } = await supabase.from("employee_private").select("*").eq("employee_id", run.employee_id).maybeSingle();
  const { data: lines } = await supabase
    .from("payslip_components").select("*").eq("payroll_run_id", params.runId).order("kind");
  const { data: company } = await supabase.from("company_settings").select("company_name").eq("id", 1).maybeSingle();

  const additions = (lines ?? []).filter((l) => l.kind !== "deduction");
  const deductions = (lines ?? []).filter((l) => l.kind === "deduction");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h1 text-text-primary">Payslip</h2>
        <PrintButton />
      </div>

      <Card>
        <CardContent className="space-y-6 p-8">
          <div className="flex items-start justify-between border-b border-border pb-4">
            <Image src="/softonoma-logo.png" alt="Softonoma" width={180} height={46} />
            <div className="text-right">
              <div className="text-h3 text-text-primary">{company?.company_name ?? "Softonoma"}</div>
              <div className="text-caption text-text-secondary">Payslip · {run.period_start} → {run.period_end}</div>
              <Badge tone={run.payment_status === "paid" ? "success" : "warning"}>{run.payment_status}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-text-secondary">Employee</span><div className="font-medium">{emp?.full_name} {formatCode(emp?.employee_code)}</div></div>
            <div><span className="text-text-secondary">Designation</span><div>{emp?.position ?? "—"}</div></div>
            <div><span className="text-text-secondary">Days worked / working</span><div className="tabular">{run.days_present}/{run.working_days}</div></div>
            <div><span className="text-text-secondary">Bank</span><div>{priv?.bank_name ?? "—"} {priv?.bank_account_number ? `· ${priv.bank_account_number}` : ""}</div></div>
          </div>

          <table className="w-full text-sm">
            <tbody>
              {additions.map((l) => (
                <tr key={l.id} className="border-b border-border">
                  <td className="py-2">{l.label}{l.description ? <span className="text-caption text-text-secondary"> — {l.description}</span> : ""}</td>
                  <td className="py-2 text-right tabular">{formatPKR(l.amount)}</td>
                </tr>
              ))}
              {deductions.map((l) => (
                <tr key={l.id} className="border-b border-border text-danger">
                  <td className="py-2">{l.label}{l.description ? <span className="text-caption"> — {l.description}</span> : ""}</td>
                  <td className="py-2 text-right tabular">− {formatPKR(l.amount)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-3">Net pay</td>
                <td className="py-3 text-right tabular text-base">{formatPKR(run.net_pay)}</td>
              </tr>
            </tbody>
          </table>

          {run.payment_status === "paid" && (
            <p className="text-caption text-text-secondary">
              Paid {run.paid_at ? new Date(run.paid_at).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" }) : ""}
              {run.credited_account ? ` to ${run.credited_account}` : ""}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
