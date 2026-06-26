"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/utils";

export function PayrollClient({
  initialRuns,
  defaultFrom,
  defaultTo,
  names,
}: {
  initialRuns: any[];
  defaultFrom: string;
  defaultTo: string;
  names: Record<string, string>;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const res = await fetch("/api/payroll/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success(`Generated ${json.runs.length} draft run(s)`);
    router.refresh();
  }

  async function setCommission(id: string, value: string) {
    const res = await fetch(`/api/payroll/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commission_amount: Number(value) || 0 }),
    });
    if (!res.ok) return toast.error("Update failed");
    toast.success("Commission updated");
    router.refresh();
  }

  async function finalise(id: string) {
    const res = await fetch(`/api/payroll/${id}/finalise`, { method: "POST" });
    if (!res.ok) return toast.error("Finalise failed");
    toast.success("Payroll finalised — payslip ready");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Generate payroll</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <Button onClick={generate} disabled={busy}>{busy ? "Generating…" : "Generate"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payroll runs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Employee</TH><TH>Base</TH><TH>OT</TH><TH>Commission</TH><TH>Benefits</TH><TH>Deduction</TH><TH>Net</TH><TH>Status</TH><TH></TH></TR>
            </THead>
            <TBody>
              {initialRuns.map((r) => (
                <TR key={r.id}>
                  <TD>{names[r.employee_id] ?? r.employee_id.slice(0, 8)}</TD>
                  <TD className="tabular">{formatPKR(r.base_salary)}</TD>
                  <TD className="tabular">{formatPKR(r.overtime_pay)}</TD>
                  <TD className="tabular">
                    {r.status === "draft" ? (
                      <Input
                        type="number"
                        defaultValue={r.commission_amount}
                        className="h-8 w-28"
                        onBlur={(e) => setCommission(r.id, e.target.value)}
                      />
                    ) : (
                      formatPKR(r.commission_amount)
                    )}
                  </TD>
                  <TD className="tabular">{formatPKR(r.benefits_total)}</TD>
                  <TD className="tabular text-danger">{formatPKR(r.deductions)}</TD>
                  <TD className="tabular font-semibold">{formatPKR(r.net_pay)}</TD>
                  <TD><Badge tone={r.status === "finalised" ? "success" : "warning"}>{r.status}</Badge></TD>
                  <TD>
                    {r.status === "draft" && (
                      <Button size="sm" onClick={() => finalise(r.id)}>Finalise</Button>
                    )}
                  </TD>
                </TR>
              ))}
              {initialRuns.length === 0 && (
                <TR><TD className="py-6 text-center text-text-secondary">No runs yet — pick a period and Generate.</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
