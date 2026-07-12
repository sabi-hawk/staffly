"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Trash2, FileText, LockOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect, NativeSelect } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatCode } from "@/lib/utils";

type Line = { id: string; label: string; amount: number; kind: string; description: string | null };

type SavedComp = { label: string; amount: number; recurring: boolean; is_fixed_amount: boolean; description: string | null };

export function PayrollClient({
  initialRuns,
  linesByRun,
  employees,
  compsByEmp = {},
  defaultFrom,
  defaultTo,
}: {
  initialRuns: any[];
  linesByRun: Record<string, Line[]>;
  employees: { id: string; full_name: string; employee_code: string | null }[];
  compsByEmp?: Record<string, SavedComp[]>;
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
  // router.refresh() re-fetches this (heavy) server page; wrapping it in a transition means isPending
  // stays true until the new data lands, so buttons show a loader for the WHOLE operation, not just fetch.
  const [isPending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
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
    refresh();
  }

  // Mutations return success; the calling RunRow toggles its own loader and refreshes via the transition.
  async function finalise(id: string): Promise<boolean> {
    const res = await fetch(`/api/payroll/${id}/finalise`, { method: "POST" });
    if (!res.ok) { toast.error("Finalise failed"); return false; }
    toast.success("Finalised"); return true;
  }
  async function reopen(id: string): Promise<boolean> {
    const res = await fetch(`/api/payroll/${id}/reopen`, { method: "POST" });
    if (!res.ok) { toast.error("Reopen failed"); return false; }
    toast.success("Reopened for editing"); return true;
  }
  async function markPaid(id: string, paid_at: string, credited_account: string, status = "paid"): Promise<boolean> {
    const res = await fetch(`/api/payroll/${id}/pay`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, paid_at: paid_at || undefined, credited_account }),
    });
    if (!res.ok) { toast.error("Update failed"); return false; }
    toast.success(status === "paid" ? "Marked paid" : "Marked pending"); return true;
  }
  async function addLine(id: string, label: string, amount: string, kind: string, description: string): Promise<boolean> {
    if (!label || !amount) { toast.error("Label & amount required"); return false; }
    const res = await fetch(`/api/payroll/${id}/lines`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, amount: Number(amount), kind, description }),
    });
    if (!res.ok) { toast.error("Add failed"); return false; }
    toast.success("Line added"); return true;
  }
  async function removeLine(id: string, lineId: string): Promise<boolean> {
    const res = await fetch(`/api/payroll/${id}/lines?lineId=${lineId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Remove failed"); return false; }
    toast.success("Removed"); return true;
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
            <DatePicker id="payroll-from" label="From" hint="Start of the payroll period." value={from} onChange={setFrom} className="w-40" />
            <DatePicker id="payroll-to" label="To" hint="End of the payroll period." value={to} onChange={setTo} className="w-40" />
            <Button onClick={generate} disabled={busy || isPending}>
              {(busy || isPending) && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Generating…" : "Generate / refresh drafts"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Payroll runs &amp; payments</CardTitle>
          <div className="flex gap-2">
            <NativeSelect aria-label="Filter by employee" value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
              <option value="">All employees</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </NativeSelect>
            <NativeSelect aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </NativeSelect>
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
                    savedComps={compsByEmp[r.employee_id] ?? []}
                    refreshing={isPending}
                    onToggle={() => setExpanded(open ? null : r.id)}
                    onFinalise={() => finalise(r.id)} onReopen={() => reopen(r.id)} onMarkPaid={markPaid}
                    onAddLine={addLine} onRemoveLine={removeLine} onRefresh={refresh}
                  />
                );
              })}
              {runs.length === 0 && <TR><TD className="py-6 text-center text-text-secondary">No runs. Pick a period and Generate.</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RunRow({ run, emp, lines, open, savedComps = [], refreshing, onToggle, onFinalise, onReopen, onMarkPaid, onAddLine, onRemoveLine, onRefresh }: any) {
  const [paidAt, setPaidAt] = useState("");
  const [account, setAccount] = useState(emp?.bank_account_number ? `${emp?.bank_name ?? ""} ${emp.bank_account_number}`.trim() : "");
  const [showPay, setShowPay] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [nl, setNl] = useState({ label: "", amount: "", kind: "addition", description: "" });
  // per-action loaders so a click gives immediate feedback through the fetch AND the server refresh
  const [acting, setActing] = useState(false);        // finalise / reopen / mark paid
  const [savingLine, setSavingLine] = useState(false); // add line
  const [removingId, setRemovingId] = useState<string | null>(null); // which line is being removed
  const rowBusy = acting || savingLine || !!removingId || refreshing;

  async function handleFinalise() { setActing(true); const ok = await onFinalise(); setActing(false); if (ok) onRefresh(); }
  async function handleReopen() { setActing(true); const ok = await onReopen(); setActing(false); if (ok) onRefresh(); }
  async function handleMarkPaid(status: string) {
    setActing(true); const ok = await onMarkPaid(run.id, paidAt, account, status); setActing(false);
    if (ok) { setShowPay(false); onRefresh(); }
  }
  async function handleAdd() {
    setSavingLine(true); const ok = await onAddLine(run.id, nl.label, nl.amount, nl.kind, nl.description); setSavingLine(false);
    if (ok) { setNl({ label: "", amount: "", kind: "addition", description: "" }); onRefresh(); }
  }
  async function handleRemove(lineId: string) {
    setRemovingId(lineId); const ok = await onRemoveLine(run.id, lineId); setRemovingId(null);
    if (ok) onRefresh();
  }

  // occasional (non-recurring) + variable categories are the ones worth quick-adding to a run
  const pickable: SavedComp[] = (savedComps as SavedComp[]).filter((c) => !c.recurring || !c.is_fixed_amount);
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
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone={run.payment_status === "paid" ? "success" : "warning"}>{run.payment_status}</Badge>
            {run.status === "finalised" && <Badge tone="neutral">finalised</Badge>}
          </span>
        </TD>
        <TD>
          <div className="flex items-center gap-1.5">
            <Link href={`/admin/payroll/payslip/${run.id}`} className="inline-flex text-text-secondary hover:text-brand-primary" title="Payslip"><FileText className="size-4" /></Link>
            {run.status === "draft"
              ? <Button size="sm" variant="secondary" onClick={handleFinalise} disabled={rowBusy}>{acting ? <Loader2 className="size-3.5 animate-spin" /> : null} Finalise</Button>
              : <Button size="sm" variant="ghost" onClick={() => setConfirmReopen(true)} disabled={rowBusy} title="Reopen for editing"><LockOpen className="size-3.5" /> Reopen</Button>}
            <Button size="sm" onClick={() => setShowPay((s) => !s)} disabled={rowBusy}>{run.payment_status === "paid" ? "Edit" : "Mark paid"}</Button>
          </div>
          <ConfirmDialog
            open={confirmReopen}
            onOpenChange={setConfirmReopen}
            title="Reopen this payslip?"
            description="It goes back to draft so you can edit its lines or regenerate it. The payment status is kept. Finalise again when you're done."
            confirmLabel="Reopen"
            onConfirm={async () => { await handleReopen(); }}
          />
        </TD>
      </TR>
      {showPay && (
        <TR>
          <TD colSpan={9} className="bg-surface">
            <div className="flex flex-wrap items-end gap-2">
              <DatePicker label="Paid date" hint="When the salary was credited to the employee." value={paidAt} onChange={setPaidAt} className="w-36" />
              <FloatInput label="Credited account" hint="The bank account or channel the salary was sent to." value={account} onChange={(e) => setAccount(e.target.value)} wrapClassName="w-64" />
              <Button size="sm" variant="success" onClick={() => handleMarkPaid("paid")} disabled={rowBusy}>{acting ? <Loader2 className="size-3.5 animate-spin" /> : null} Save paid</Button>
              {run.payment_status === "paid" && <Button size="sm" variant="ghost" onClick={() => handleMarkPaid("pending")} disabled={rowBusy}>Mark pending</Button>}
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
                  <span>{l.label}{l.description ? <span className="text-caption text-text-secondary"> · {l.description}</span> : ""}</span>
                  <span className="flex items-center gap-3"><span className="tabular">{formatPKR(l.amount)}</span>
                    {run.status === "draft" && (
                      <button onClick={() => handleRemove(l.id)} disabled={rowBusy} className="text-text-secondary hover:text-danger disabled:opacity-40" aria-label="Remove line">
                        {removingId === l.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {deductions.map((l: Line) => (
                <div key={l.id} className="flex items-center justify-between rounded border border-border bg-white px-3 py-1.5 text-sm text-danger">
                  <span>{l.label}{l.description ? <span className="text-caption"> · {l.description}</span> : ""}</span>
                  <span className="flex items-center gap-3"><span className="tabular">− {formatPKR(l.amount)}</span>
                    {run.status === "draft" && (
                      <button onClick={() => handleRemove(l.id)} disabled={rowBusy} className="hover:text-danger disabled:opacity-40" aria-label="Remove line">
                        {removingId === l.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {run.status === "draft" && (
                <div className="space-y-2 border-t border-border pt-2">
                  {pickable.length > 0 && (
                    <FloatSelect
                      label="Add a saved category"
                      hint="Quick-add one of this employee's occasional or variable compensation categories (fills the label and amount below)."
                      value=""
                      onChange={(e) => {
                        const c = pickable.find((x) => x.label === e.target.value);
                        if (c) setNl({ label: c.label, amount: String(c.amount), kind: "addition", description: c.description ?? "" });
                      }}
                      wrapClassName="w-72"
                    >
                      <option value="">Pick a category…</option>
                      {pickable.map((c) => <option key={c.label} value={c.label}>{c.label} ({formatPKR(c.amount)}{c.recurring ? " · variable" : ""})</option>)}
                    </FloatSelect>
                  )}
                  <div className="flex flex-wrap items-end gap-2">
                    <FloatInput label="Label" value={nl.label} onChange={(e) => setNl({ ...nl, label: e.target.value })} wrapClassName="w-40" />
                    <FloatInput label="Amount" type="number" value={nl.amount} onChange={(e) => setNl({ ...nl, amount: e.target.value })} wrapClassName="w-28" />
                    <FloatSelect label="Type" value={nl.kind} onChange={(e) => setNl({ ...nl, kind: e.target.value })} wrapClassName="w-36">
                      <option value="addition">Addition</option><option value="deduction">Deduction</option>
                    </FloatSelect>
                    <FloatInput label="Description" value={nl.description} onChange={(e) => setNl({ ...nl, description: e.target.value })} wrapClassName="w-48" />
                    <Button size="sm" onClick={handleAdd} disabled={rowBusy || !nl.label || !nl.amount}>
                      {savingLine ? <Loader2 className="size-4 animate-spin" /> : null} Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TD>
        </TR>
      )}
    </>
  );
}
