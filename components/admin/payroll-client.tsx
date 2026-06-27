"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatCode } from "@/lib/utils";

type Line = { id: string; label: string; amount: number; kind: string; description: string | null };

export function PayrollClient({
  initialRuns,
  linesByRun,
  employees,
  defaultFrom,
  defaultTo,
}: {
  initialRuns: any[];
  linesByRun: Record<string, Line[]>;
  employees: { id: string; full_name: string; employee_code: string | null }[];
  defaultFrom: string;
  defaultTo: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState(false);
  const [empFilter, setEmpFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const names = Object.fromEntries(employees.map((e) => [e.id, e]));

  async function generate() {
    setBusy(true);
    const res = await fetch("/api/payroll/generate", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success(`Generated ${json.runs.length} run(s)`);
    router.refresh();
  }

  async function finalise(id: string) {
    const res = await fetch(`/api/payroll/${id}/finalise`, { method: "POST" });
    if (!res.ok) return toast.error("Finalise failed");
    toast.success("Finalised"); router.refresh();
  }

  async function markPaid(id: string, paid_at: string, credited_account: string, status = "paid") {
    const res = await fetch(`/api/payroll/${id}/pay`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, paid_at: paid_at || undefined, credited_account }),
    });
    if (!res.ok) return toast.error("Update failed");
    toast.success(status === "paid" ? "Marked paid" : "Marked pending"); router.refresh();
  }

  async function addLine(id: string, label: string, amount: string, kind: string, description: string) {
    if (!label || !amount) return toast.error("Label & amount required");
    const res = await fetch(`/api/payroll/${id}/lines`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, amount: Number(amount), kind, description }),
    });
    if (!res.ok) return toast.error("Add failed");
    toast.success("Line added"); router.refresh();
  }
  async function removeLine(id: string, lineId: string) {
    const res = await fetch(`/api/payroll/${id}/lines?lineId=${lineId}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Remove failed");
    toast.success("Removed"); router.refresh();
  }

  const runs = initialRuns.filter(
    (r) => (!empFilter || r.employee_id === empFilter) && (statusFilter === "all" || r.payment_status === statusFilter)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Generate payroll</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <Button onClick={generate} disabled={busy}>{busy ? "Generating…" : "Generate / refresh drafts"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Payroll runs &amp; payments</CardTitle>
          <div className="flex gap-2">
            <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} className="h-9 rounded-md border border-border bg-white px-3 text-sm">
              <option value="">All employees</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-border bg-white px-3 text-sm">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Code</TH><TH>Employee</TH><TH>Period</TH><TH>Base</TH><TH>Additions</TH><TH>Deductions</TH><TH>Net</TH><TH>Payment</TH><TH></TH></TR>
            </THead>
            <TBody>
              {runs.map((r) => {
                const lines = linesByRun[r.id] ?? [];
                const open = expanded === r.id;
                return (
                  <RunRow
                    key={r.id} run={r} emp={names[r.employee_id]} lines={lines} open={open}
                    onToggle={() => setExpanded(open ? null : r.id)}
                    onFinalise={() => finalise(r.id)} onMarkPaid={markPaid}
                    onAddLine={addLine} onRemoveLine={removeLine}
                  />
                );
              })}
              {runs.length === 0 && <TR><TD className="py-6 text-center text-text-secondary">No runs — pick a period and Generate.</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RunRow({ run, emp, lines, open, onToggle, onFinalise, onMarkPaid, onAddLine, onRemoveLine }: any) {
  const [paidAt, setPaidAt] = useState("");
  const [account, setAccount] = useState(emp?.bank_account_number ? `${emp?.bank_name ?? ""} ${emp.bank_account_number}`.trim() : "");
  const [showPay, setShowPay] = useState(false);
  const [nl, setNl] = useState({ label: "", amount: "", kind: "addition", description: "" });
  const additions = lines.filter((l: Line) => l.kind !== "deduction" && l.kind !== "base");
  const deductions = lines.filter((l: Line) => l.kind === "deduction");

  return (
    <>
      <TR>
        <TD className="tabular text-text-secondary">{formatCode(emp?.employee_code)}</TD>
        <TD>{emp?.full_name ?? "—"}</TD>
        <TD className="tabular text-caption">{run.period_start}→{run.period_end}</TD>
        <TD className="tabular">{formatPKR(run.base_salary)}</TD>
        <TD>
          <button onClick={onToggle} className="inline-flex items-center gap-1 tabular text-brand-primary hover:underline">
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            {formatPKR(run.additions_total)}
          </button>
        </TD>
        <TD className="tabular text-danger">{formatPKR(run.deductions)}</TD>
        <TD className="tabular font-semibold">{formatPKR(run.net_pay)}</TD>
        <TD>
          <Badge tone={run.payment_status === "paid" ? "success" : "warning"}>{run.payment_status}</Badge>
          {run.status === "finalised" && <Badge tone="neutral" className="ml-1">finalised</Badge>}
        </TD>
        <TD>
          <div className="flex items-center gap-1.5">
            <Link href={`/admin/payroll/payslip/${run.id}`} className="inline-flex text-text-secondary hover:text-brand-primary" title="Payslip"><FileText className="size-4" /></Link>
            {run.status === "draft" && <Button size="sm" variant="secondary" onClick={onFinalise}>Finalise</Button>}
            <Button size="sm" onClick={() => setShowPay((s) => !s)}>{run.payment_status === "paid" ? "Edit" : "Mark paid"}</Button>
          </div>
        </TD>
      </TR>
      {showPay && (
        <TR>
          <TD colSpan={9} className="bg-surface">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-caption text-text-secondary">Paid date<Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="h-8" /></label>
              <label className="text-caption text-text-secondary">Credited account<Input value={account} onChange={(e) => setAccount(e.target.value)} className="h-8 w-64" /></label>
              <Button size="sm" variant="success" onClick={() => { onMarkPaid(run.id, paidAt, account, "paid"); setShowPay(false); }}>Save paid</Button>
              {run.payment_status === "paid" && <Button size="sm" variant="ghost" onClick={() => { onMarkPaid(run.id, "", "", "pending"); setShowPay(false); }}>Mark pending</Button>}
            </div>
          </TD>
        </TR>
      )}
      {open && (
        <TR>
          <TD colSpan={9} className="bg-surface">
            <div className="space-y-2 py-1">
              <div className="text-caption font-medium text-text-secondary">Additions</div>
              {additions.length === 0 && <p className="text-caption text-text-secondary">No additions.</p>}
              {additions.map((l: Line) => (
                <div key={l.id} className="flex items-center justify-between rounded border border-border bg-white px-3 py-1.5 text-sm">
                  <span>{l.label}{l.description ? <span className="text-caption text-text-secondary"> — {l.description}</span> : ""}</span>
                  <span className="flex items-center gap-3"><span className="tabular">{formatPKR(l.amount)}</span>
                    {run.status === "draft" && <button onClick={() => onRemoveLine(run.id, l.id)} className="text-text-secondary hover:text-danger"><Trash2 className="size-3.5" /></button>}
                  </span>
                </div>
              ))}
              {deductions.map((l: Line) => (
                <div key={l.id} className="flex items-center justify-between rounded border border-border bg-white px-3 py-1.5 text-sm text-danger">
                  <span>{l.label}{l.description ? <span className="text-caption"> — {l.description}</span> : ""}</span>
                  <span className="flex items-center gap-3"><span className="tabular">− {formatPKR(l.amount)}</span>
                    {run.status === "draft" && <button onClick={() => onRemoveLine(run.id, l.id)} className="hover:text-danger"><Trash2 className="size-3.5" /></button>}
                  </span>
                </div>
              ))}
              {run.status === "draft" && (
                <div className="flex flex-wrap items-end gap-2 pt-1">
                  <Input placeholder="label" value={nl.label} onChange={(e) => setNl({ ...nl, label: e.target.value })} className="h-8 w-40" />
                  <Input placeholder="amount" type="number" value={nl.amount} onChange={(e) => setNl({ ...nl, amount: e.target.value })} className="h-8 w-28" />
                  <select value={nl.kind} onChange={(e) => setNl({ ...nl, kind: e.target.value })} className="h-8 rounded-md border border-border bg-white px-2 text-sm">
                    <option value="addition">Addition</option><option value="deduction">Deduction</option>
                  </select>
                  <Input placeholder="description" value={nl.description} onChange={(e) => setNl({ ...nl, description: e.target.value })} className="h-8 w-48" />
                  <Button size="sm" onClick={() => { onAddLine(run.id, nl.label, nl.amount, nl.kind, nl.description); setNl({ label: "", amount: "", kind: "addition", description: "" }); }}>Add line</Button>
                </div>
              )}
            </div>
          </TD>
        </TR>
      )}
    </>
  );
}
