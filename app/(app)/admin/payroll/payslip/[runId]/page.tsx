import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/admin/print-button";
import { formatPKR, formatCode } from "@/lib/utils";

const money = (n: number) => Number(n || 0).toLocaleString("en-PK");

export default async function PayslipPage({ params }: { params: { runId: string } }) {
  const viewer = (await getCurrentProfile())!;
  if (!isSuperAdmin(viewer.role)) redirect("/admin/dashboard");
  const supabase = createClient();

  const { data: run } = await supabase.from("payroll_runs").select("*").eq("id", params.runId).single();
  if (!run) return <p className="text-text-secondary">Payslip not found.</p>;
  const { data: emp } = await supabase.from("profiles").select("*").eq("id", run.employee_id).single();
  const { data: priv } = await supabase.from("employee_private").select("*").eq("employee_id", run.employee_id).maybeSingle();
  const { data: lines } = await supabase.from("payslip_components").select("*").eq("payroll_run_id", params.runId).order("kind");
  const { data: company } = await supabase.from("company_settings").select("company_name").eq("id", 1).maybeSingle();

  const particulars = (lines ?? []).filter((l) => l.kind !== "deduction");
  const deductions = (lines ?? []).filter((l) => l.kind === "deduction");
  const grossPay = particulars.reduce((s, l) => s + Number(l.amount), 0);
  const start = new Date(run.period_start);
  const month = start.toLocaleString("en-US", { month: "long" });
  const year = start.getFullYear();

  const Cell = ({ children, head = false, right = false }: { children: React.ReactNode; head?: boolean; right?: boolean }) => (
    <td className={`border border-border px-3 py-2 ${head ? "font-semibold bg-surface" : ""} ${right ? "text-right tabular" : ""}`}>{children}</td>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between no-print">
        <Link href="/admin/payroll" className="inline-flex items-center gap-1.5 text-caption font-medium text-text-secondary hover:text-brand-primary">
          <ArrowLeft className="size-4" /> Back to payroll
        </Link>
        <PrintButton />
      </div>

      <Card>
        <CardContent className="space-y-5 p-8">
          {/* letterhead */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <Image src="/softonoma-logo.png" alt="Softonoma" width={170} height={44} />
            <div className="text-caption text-text-secondary">Date: {new Date(run.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })}</div>
          </div>

          <div className="rounded-md border border-border bg-brand-light/40 py-1.5 text-center text-h3 font-semibold">Salary Slip</div>

          {/* employee + period */}
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-text-secondary">Employee Name</td><td className="py-1 font-medium">{emp?.full_name}</td>
                <td className="py-1 text-text-secondary">Month</td><td className="py-1 font-medium">{month}</td>
              </tr>
              <tr>
                <td className="py-1 text-text-secondary">CNIC / NTN</td><td className="py-1 font-medium">{priv?.cnic ?? "—"}</td>
                <td className="py-1 text-text-secondary">Year</td><td className="py-1 font-medium tabular">{year}</td>
              </tr>
              <tr>
                <td className="py-1 text-text-secondary">Designation</td><td className="py-1 font-medium">{emp?.position ?? "—"}</td>
                <td className="py-1 text-text-secondary">Joining Date</td><td className="py-1 font-medium tabular">{emp?.joining_date ?? "—"}</td>
              </tr>
              <tr>
                <td className="py-1 text-text-secondary">Employee Code</td><td className="py-1 font-medium tabular">{formatCode(emp?.employee_code)}</td>
                <td className="py-1 text-text-secondary">Company</td><td className="py-1 font-medium">{company?.company_name ?? "Softonoma"}</td>
              </tr>
            </tbody>
          </table>

          {/* particulars / deductions */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Cell head>PARTICULARS</Cell><Cell head right>AMOUNT Rs.</Cell>
                <Cell head>DEDUCTIONS</Cell><Cell head right>AMOUNT Rs.</Cell>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(particulars.length, deductions.length, 1) }).map((_, i) => (
                <tr key={i}>
                  <Cell>{particulars[i]?.label ?? ""}{particulars[i]?.description ? <span className="text-caption text-text-secondary"> ({particulars[i].description})</span> : ""}</Cell>
                  <Cell right>{particulars[i] ? money(particulars[i].amount) : ""}</Cell>
                  <Cell>{deductions[i]?.label ?? ""}</Cell>
                  <Cell right>{deductions[i] ? money(deductions[i].amount) : ""}</Cell>
                </tr>
              ))}
              <tr>
                <Cell head>Gross pay</Cell><Cell head right>{money(grossPay)}</Cell>
                <Cell head>Net Pay</Cell><Cell head right>{money(run.net_pay)}</Cell>
              </tr>
            </tbody>
          </table>

          {/* payment details */}
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr><Cell head>Payment Mode</Cell><Cell>Bank Transfer</Cell></tr>
              <tr><Cell head>Bank Name</Cell><Cell>{priv?.bank_name ?? "—"}</Cell></tr>
              <tr><Cell head>Account Title</Cell><Cell>{priv?.bank_account_title ?? "—"}</Cell></tr>
              <tr><Cell head>Account Number</Cell><Cell>{priv?.bank_account_number ?? "—"}</Cell></tr>
              <tr><Cell head>Status</Cell><Cell>
                <Badge tone={run.payment_status === "paid" ? "success" : "warning"}>{run.payment_status}</Badge>
                {run.payment_status === "paid" && run.paid_at ? ` · ${new Date(run.paid_at).toLocaleDateString("en-PK")}` : ""}
              </Cell></tr>
            </tbody>
          </table>

          {/* footer / signatory */}
          <div className="pt-2">
            <div className="font-semibold text-text-primary">{company?.company_name ?? "Softonoma"}</div>
            <div className="text-caption text-text-secondary">Authorised by Finance · contact@softonoma.com</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
