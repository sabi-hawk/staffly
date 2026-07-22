"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Trash2, FileText, LockOpen, Loader2, RefreshCw, CircleX, Undo2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect, NativeSelect } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPKR, formatCode, cn } from "@/lib/utils";
import { monthBounds, MONTH_NAMES } from "@/lib/time";

type Line = { id: string; label: string; amount: number; kind: string; description: string | null; is_commission?: boolean; dismissed?: boolean };
const COLS = 10; // table column count (for expanded-row colSpan)

type SavedComp = { label: string; amount: number; recurring: boolean; is_fixed_amount: boolean; description: string | null };

export function PayrollClient({
  initialRuns,
  linesByRun,
  employees,
  compsByEmp = {},
  defaultYear,
  defaultMonth,
}: {
  initialRuns: any[];
  linesByRun: Record<string, Line[]>;
  employees: { id: string; full_name: string; employee_code: string | null }[];
  compsByEmp?: Record<string, SavedComp[]>;
  defaultYear: number;
  defaultMonth: number; // 1-12
}) {
  const router = useRouter();
  // Month-first: pick a month → the period is always the 1st to the last day. Custom range is the
  // advanced escape hatch (mid-month joiner). Defaults to the current company month.
  const [custom, setCustom] = useState(false);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [from, setFrom] = useState(monthBounds(defaultYear, defaultMonth).from);
  const [to, setTo] = useState(monthBounds(defaultYear, defaultMonth).to);
  const [busy, setBusy] = useState(false);
  const yearOptions = [defaultYear - 1, defaultYear, defaultYear + 1];
  const [empFilter, setEmpFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  // router.refresh() re-fetches this (heavy) server page; wrapping it in a transition means isPending
  // stays true until the new data lands, so buttons show a loader for the WHOLE operation, not just fetch.
  const [isPending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  const names = Object.fromEntries(employees.map((e) => [e.id, e]));

  async function generate() {
    const period = custom ? { from, to } : monthBounds(year, month);
    setBusy(true);
    const res = await fetch("/api/payroll/generate", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(period),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success(`Generated ${json.runs.length} run(s)`);
    refresh();
  }

  async function deleteRun(id: string): Promise<boolean> {
    const res = await fetch(`/api/payroll/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Delete failed"); return false; }
    toast.success("Run deleted"); return true;
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
  async function dismissLine(id: string, lineId: string, dismissed: boolean): Promise<boolean> {
    const res = await fetch(`/api/payroll/${id}/lines`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ lineId, dismissed }),
    });
    if (!res.ok) { toast.error("Failed"); return false; }
    toast.success(dismissed ? "Line dismissed" : "Line restored"); return true;
  }
  async function recomputeRun(id: string): Promise<boolean> {
    const res = await fetch(`/api/payroll/${id}/recompute`, { method: "POST" });
    if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Recompute failed"); return false; }
    toast.success("Recomputed"); return true;
  }
  async function addCommission(id: string, body: any): Promise<boolean> {
    const res = await fetch(`/api/payroll/${id}/commission`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Add failed"); return false; }
    toast.success("Commission added"); return true;
  }

  const runs = initialRuns.filter(
    (r) => (!empFilter || r.employee_id === empFilter) && (statusFilter === "all" || r.payment_status === statusFilter)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Generate payroll</CardTitle></CardHeader>
        <CardContent>
          {!custom ? (
            <div className="flex flex-wrap items-end gap-3">
              <FloatSelect label="Month" hint="Generates the 1st to the last day of this month for every employee with a salary." value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} wrapClassName="w-44">
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </FloatSelect>
              <FloatSelect label="Year" value={String(year)} onChange={(e) => setYear(Number(e.target.value))} wrapClassName="w-28">
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </FloatSelect>
              <Button onClick={generate} disabled={busy || isPending}>
                {(busy || isPending) && <Loader2 className="size-4 animate-spin" />}
                {busy ? "Generating…" : `Generate ${MONTH_NAMES[month - 1]} ${year}`}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <DatePicker id="payroll-from" label="From" hint="Start of the custom period, e.g. a mid-month joiner's first day." value={from} onChange={setFrom} className="w-40" />
              <DatePicker id="payroll-to" label="To" hint="End of the custom period." value={to} onChange={setTo} className="w-40" />
              <Button onClick={generate} disabled={busy || isPending}>
                {(busy || isPending) && <Loader2 className="size-4 animate-spin" />}
                {busy ? "Generating…" : "Generate range"}
              </Button>
            </div>
          )}
          <button
            type="button"
            onClick={() => { if (!custom) { const mb = monthBounds(year, month); setFrom(mb.from); setTo(mb.to); } setCustom((c) => !c); }}
            className="mt-3 text-caption font-medium text-brand-primary hover:underline"
          >
            {custom ? "← Back to monthly" : "Use a custom date range (mid-month joiner, etc.)"}
          </button>
          <p className="mt-2 text-caption text-text-secondary">
            Safe to repeat: Generate refreshes each employee&apos;s <strong>draft</strong> for the period and never touches a finalised one. Everyone runs the 1st to the last day of the month unless you pick a custom range.
          </p>
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
              <TR><TH className="w-[36px]"></TH><TH>Code</TH><TH>Employee</TH><TH>Period</TH><TH>Base</TH><TH>Additions</TH><TH>Deductions</TH><TH>Net</TH><TH>Payment</TH><TH></TH></TR>
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
                    onAddLine={addLine} onRemoveLine={removeLine} onDelete={deleteRun} onRefresh={refresh}
                    onDismissLine={dismissLine} onRecompute={recomputeRun} onAddCommission={addCommission}
                  />
                );
              })}
              {runs.length === 0 && <TR><TD colSpan={COLS} className="py-6 text-center text-text-secondary">No runs. Pick a period and Generate.</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RunRow({ run, emp, lines, open, savedComps = [], refreshing, onToggle, onFinalise, onReopen, onMarkPaid, onAddLine, onRemoveLine, onDelete, onRefresh, onDismissLine, onRecompute, onAddCommission }: any) {
  const [paidAt, setPaidAt] = useState("");
  const [account, setAccount] = useState(emp?.bank_account_number ? `${emp?.bank_name ?? ""} ${emp.bank_account_number}`.trim() : "");
  const [showPay, setShowPay] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [nl, setNl] = useState({ label: "", amount: "", kind: "addition", description: "" });
  const [acting, setActing] = useState(false);
  const [savingLine, setSavingLine] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [addingComm, setAddingComm] = useState(false);
  const [deals, setDeals] = useState<any[] | null>(null);
  const runStart = new Date(`${run.period_start}T00:00:00Z`);
  const emptyComm = { dealId: "", basis: "amount", amount: "", mon: runStart.getUTCMonth() + 1, yr: runStart.getUTCFullYear(), label: "" };
  const [comm, setComm] = useState(emptyComm);
  const rowBusy = acting || savingLine || !!removingId || !!dismissingId || recomputing || addingComm || refreshing;

  // lazy-load this employee's deals when the row opens (for the add-commission picker)
  useEffect(() => {
    if (open && deals === null) {
      fetch(`/api/payroll/${run.id}/commission`).then((r) => r.json()).then((j) => setDeals(j.deals ?? [])).catch(() => setDeals([]));
    }
  }, [open, deals, run.id]);

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
  async function handleDismiss(lineId: string, dismissed: boolean) {
    setDismissingId(lineId); const ok = await onDismissLine(run.id, lineId, dismissed); setDismissingId(null);
    if (ok) onRefresh();
  }
  async function handleRecompute() { setRecomputing(true); const ok = await onRecompute(run.id); setRecomputing(false); if (ok) onRefresh(); }
  async function handleAddCommission() {
    if (!comm.dealId) return toast.error("Pick a deal");
    const body: any = { deal_id: comm.dealId, label: comm.label || undefined };
    if (comm.basis === "amount") { if (!comm.amount) return toast.error("Enter an amount"); body.amount = Number(comm.amount); }
    else { body.month = `${comm.yr}-${String(comm.mon).padStart(2, "0")}-01`; }
    setAddingComm(true); const ok = await onAddCommission(run.id, body); setAddingComm(false);
    if (ok) { setComm(emptyComm); onRefresh(); }
  }
  async function handleDelete() { setActing(true); const ok = await onDelete(run.id); setActing(false); if (ok) onRefresh(); }

  const pickable: SavedComp[] = (savedComps as SavedComp[]).filter((c) => !c.recurring || !c.is_fixed_amount);
  const isDraft = run.status === "draft";
  const base = lines.filter((l: Line) => l.kind === "base");
  const additions = lines.filter((l: Line) => l.kind !== "deduction" && l.kind !== "base");
  const deductions = lines.filter((l: Line) => l.kind === "deduction");

  // one line row in the expanded breakdown, with dismiss (keep record) + remove controls on drafts.
  const LineItem = ({ l, sign }: { l: Line; sign?: boolean }) => {
    const dim = !!l.dismissed;
    return (
      <div className={cn("flex items-center justify-between gap-3 rounded border bg-white px-3 py-1.5 text-sm", dim ? "border-dashed opacity-55" : "border-border", sign && !dim ? "text-danger" : "")}>
        <span className={cn("min-w-0", dim && "line-through")}>
          {l.is_commission && <span className="mr-1.5 rounded bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary">commission</span>}
          {l.label}{l.description ? <span className="text-caption text-text-secondary"> · {l.description}</span> : ""}
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          <span className={cn("tabular", dim && "line-through text-text-secondary")}>{sign ? "− " : ""}{formatPKR(l.amount)}</span>
          {isDraft && l.kind !== "base" && (
            <>
              <button onClick={() => handleDismiss(l.id, !dim)} disabled={rowBusy} className="text-text-secondary hover:text-text-primary disabled:opacity-40" title={dim ? "Restore (include again)" : "Dismiss (exclude from pay, keep the record)"}>
                {dismissingId === l.id ? <Loader2 className="size-3.5 animate-spin" /> : dim ? <Undo2 className="size-3.5" /> : <CircleX className="size-3.5" />}
              </button>
              <button onClick={() => handleRemove(l.id)} disabled={rowBusy} className="text-text-secondary hover:text-danger disabled:opacity-40" title="Remove line">
                {removingId === l.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </button>
            </>
          )}
        </span>
      </div>
    );
  };

  return (
    <>
      <TR>
        <TD className="pr-0">
          <button onClick={onToggle} className="inline-flex size-6 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-brand-primary" aria-label={open ? "Collapse" : "Expand breakdown"}>
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </TD>
        <TD className="tabular text-text-secondary">{formatCode(emp?.employee_code)}</TD>
        <TD>{emp?.full_name ?? "—"}</TD>
        <TD className="tabular text-caption">{run.period_start}→{run.period_end}</TD>
        <TD className="tabular">{formatPKR(run.base_salary)}</TD>
        <TD className="tabular">{formatPKR(run.additions_total)}</TD>
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
            {run.status === "draft" && (
              <button onClick={() => setConfirmDelete(true)} disabled={rowBusy} title="Delete this draft run" className="inline-flex text-text-secondary hover:text-danger disabled:opacity-40">
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
          <ConfirmDialog
            open={confirmReopen}
            onOpenChange={setConfirmReopen}
            title="Reopen this payslip?"
            description="It goes back to draft so you can edit its lines or regenerate it. The payment status is kept. Finalise again when you're done."
            confirmLabel="Reopen"
            onConfirm={async () => { await handleReopen(); }}
          />
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title={`Delete this draft run (${run.period_start} → ${run.period_end})?`}
            description="Removes the draft payroll run and its payslip lines. You can regenerate it anytime. A finalised run can't be deleted (reopen it first)."
            confirmLabel="Delete run"
            tone="danger"
            onConfirm={async () => { await handleDelete(); }}
          />
        </TD>
      </TR>
      {showPay && (
        <TR>
          <TD colSpan={COLS} className="bg-surface">
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
          <TD colSpan={COLS} className="bg-surface">
            <div className="space-y-3 py-1">
              {/* full breakdown */}
              <div className="flex items-center justify-between">
                <div className="text-caption font-medium text-text-secondary">Breakdown</div>
                {isDraft && (
                  <Button size="sm" variant="outline" onClick={handleRecompute} disabled={rowBusy} title="Re-run this employee's calculation for the period — refreshes the missing-attendance deduction as days pass (keeps dismissed lines).">
                    {recomputing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Recompute
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                {base.map((l: Line) => <LineItem key={l.id} l={l} />)}
                {additions.map((l: Line) => <LineItem key={l.id} l={l} />)}
                {deductions.map((l: Line) => <LineItem key={l.id} l={l} sign />)}
                {lines.length === 0 && <p className="text-caption text-text-secondary">No line items.</p>}
              </div>

              {isDraft && (
                <>
                  {/* add a deal commission (catch up a missed / previous-month commission) */}
                  <div className="space-y-2 border-t border-border pt-2">
                    <div className="text-caption font-medium text-text-secondary">Add deal commission</div>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="w-[30rem] max-w-full">
                        <Combobox label="Deal" hint="A deal this person is on. Search by company, designation, profile or code." options={(deals ?? []).map((d: any) => ({ value: d.id, label: d.label, sublabel: d.sublabel, color: d.color }))} value={comm.dealId} onChange={(v) => setComm({ ...comm, dealId: v })} placeholder={deals === null ? "Loading…" : "Pick a deal…"} searchPlaceholder="Search deals…" />
                      </div>
                      <FloatSelect label="Basis" value={comm.basis} onChange={(e) => setComm({ ...comm, basis: e.target.value })} wrapClassName="w-48">
                        <option value="amount">Direct amount</option>
                        <option value="month">% of a month&apos;s receipts</option>
                      </FloatSelect>
                      {comm.basis === "amount" ? (
                        <FloatInput label="Amount (PKR)" type="number" value={comm.amount} onChange={(e) => setComm({ ...comm, amount: e.target.value })} wrapClassName="w-32" />
                      ) : (
                        <>
                          <FloatSelect label="Billing month" hint="The month the missed receipts belong to (the month you tagged them when logging the payment). The deal's stored rate × that month's receipts is used." value={String(comm.mon)} onChange={(e) => setComm({ ...comm, mon: Number(e.target.value) })} wrapClassName="w-36">
                            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                          </FloatSelect>
                          <FloatSelect label="Year" value={String(comm.yr)} onChange={(e) => setComm({ ...comm, yr: Number(e.target.value) })} wrapClassName="w-24">
                            {[runStart.getUTCFullYear() - 1, runStart.getUTCFullYear(), runStart.getUTCFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                          </FloatSelect>
                        </>
                      )}
                      <FloatInput label="Label (optional)" value={comm.label} onChange={(e) => setComm({ ...comm, label: e.target.value })} wrapClassName="w-40" />
                      <Button size="sm" onClick={handleAddCommission} disabled={rowBusy || !comm.dealId}>
                        {addingComm ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add commission
                      </Button>
                    </div>
                    <p className="text-caption text-text-secondary">Catch up a commission missed on a previous month — a direct amount you know, or the stored rate × the receipts billed to a chosen month.</p>
                  </div>

                  {/* add a manual addition / deduction */}
                  <div className="space-y-2 border-t border-border pt-2">
                    <div className="text-caption font-medium text-text-secondary">Add an addition or deduction</div>
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
                </>
              )}
            </div>
          </TD>
        </TR>
      )}
    </>
  );
}
