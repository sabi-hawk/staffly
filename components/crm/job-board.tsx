"use client";
// Shared BD "Job Hunt Board". Server loads a chosen DAY (default today) paginated (default 200); the
// client refines by BD / company / position, bulk-selects rows to Copy links (line-by-line, for the
// tab-opener extension), and subscribes to Supabase realtime for live updates. Duplicate companies are
// colour-coded by occurrence. Rows expand — the OWNER edits any field, ANY BD edits the shared feedback
// and can dismiss (struck through, kept with the reason).
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Copy, ChevronRight, ChevronDown, ChevronLeft, ExternalLink, EyeOff, RotateCcw, Trash2, Loader2, RefreshCw, ClipboardPaste, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect, NativeSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ColorChip } from "@/components/crm/crm-cells";
import { formatCrmDatetime, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Opt } from "@/lib/crm/options";

/* eslint-disable @typescript-eslint/no-explicit-any */

const OCC = [
  { min: 2, label: "2 posts", cls: "bg-sky-100 text-sky-800 border-sky-200" },
  { min: 3, label: "3 posts", cls: "bg-violet-100 text-violet-800 border-violet-200" },
  { min: 4, label: "4 posts", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  { min: 5, label: "5+ posts", cls: "bg-rose-100 text-rose-800 border-rose-200" },
];
const occStyle = (n: number) => (n >= 5 ? OCC[3] : n === 4 ? OCC[2] : n === 3 ? OCC[1] : n === 2 ? OCC[0] : null);
const isUrl = (s?: string | null) => !!s && /^https?:\/\//i.test(s);
const PER_PAGE = [100, 200, 500, 1000];
async function copy(text: string, msg: string) { try { await navigator.clipboard.writeText(text); toast.success(msg); } catch { toast.error("Copy failed"); } }

export function JobBoard({ rows: initialRows, total, page, pageSize, day, bds, stacks, meId }: { rows: any[]; total: number; page: number; pageSize: number; day: string; bds: Opt[]; stacks: any[]; meId: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  const setParam = (updates: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) { if (v) p.set(k, v); else p.delete(k); }
    startTransition(() => router.push(`?${p.toString()}`));
  };

  // Local copy of the rows so edits/deletes apply INSTANTLY (optimistic) instead of waiting on a full
  // server round-trip. `pending` tracks rows with an in-flight write so a background refresh (realtime,
  // add, manual) doesn't clobber the optimistic value before the server confirms it.
  const [rows, setRows] = useState<any[]>(initialRows);
  const pendingWrites = useRef<Map<string, "patch" | "delete">>(new Map());
  useEffect(() => {
    setRows((prev) => {
      if (pendingWrites.current.size === 0) return initialRows;
      const localById = new Map(prev.map((r) => [r.id, r]));
      return initialRows
        .filter((r) => pendingWrites.current.get(r.id) !== "delete")
        .map((r) => (pendingWrites.current.has(r.id) ? localById.get(r.id) ?? r : r));
    });
  }, [initialRows]);

  // Optimistically merge a change into one row (updating the joined stack chip too), POST in the
  // background, and reconcile — realtime/refresh replaces it with the server row in the SAME position
  // (stable ordering), or we revert + toast on failure.
  async function patchRow(id: string, body: any, ok = "Saved") {
    const prev = rows;
    pendingWrites.current.set(id, "patch");
    setRows((rs) => rs.map((r) => (r.id === id ? mergeRow(r, body, stacks) : r)));
    try {
      const res = await fetch(`/api/crm/job-hunts/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      toast.success(ok);
    } catch (e) {
      setRows(prev);
      toast.error((e as Error).message);
    } finally {
      pendingWrites.current.delete(id);
    }
  }
  async function deleteRow(id: string) {
    const prev = rows;
    pendingWrites.current.set(id, "delete");
    setRows((rs) => rs.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/crm/job-hunts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Deleted");
    } catch (e) {
      setRows(prev);
      toast.error((e as Error).message);
    } finally {
      pendingWrites.current.delete(id);
    }
  }

  // live updates on the board (any change) + a manual Refresh.
  useEffect(() => {
    const sb = createClient();
    const ch = sb.channel("job_hunts_board").on("postgres_changes", { event: "*", schema: "public", table: "job_hunts" }, () => startTransition(() => router.refresh())).subscribe();
    return () => { sb.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) { const c = (r.company ?? "").trim().toLowerCase(); if (c) m.set(c, (m.get(c) ?? 0) + 1); }
    return m;
  }, [rows]);
  const urlSet = useMemo(() => new Set(rows.filter((r) => r.job_post_url).map((r) => String(r.job_post_url).trim().toLowerCase())), [rows]);

  // client refine
  const [fOwner, setFOwner] = useState("");
  const [fCompany, setFCompany] = useState("");
  const [fPosition, setFPosition] = useState("");
  const filtered = rows.filter((r) =>
    (!fOwner || r.owner_bd_id === fOwner) &&
    (!fCompany || (r.company ?? "").toLowerCase().includes(fCompany.toLowerCase())) &&
    (!fPosition || (r.position ?? "").toLowerCase().includes(fPosition.toLowerCase()))
  );

  // bulk selection (over the FILTERED set) → copy links
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filteredIds = filtered.map((r) => r.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected((prev) => { const n = new Set(prev); if (allSelected) filteredIds.forEach((id) => n.delete(id)); else filteredIds.forEach((id) => n.add(id)); return n; });
  const toggleOne = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectedUrls = filtered.filter((r) => selected.has(r.id) && r.job_post_url).map((r) => r.job_post_url as string);
  const copySelected = () => { if (!selectedUrls.length) return toast.error("Select rows that have a link"); copy(selectedUrls.join("\n"), `Copied ${selectedUrls.length} link${selectedUrls.length === 1 ? "" : "s"}`); };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const bdName = (id: string, label: string) => (id === meId ? "You" : label);

  return (
    <div className="space-y-4">
      <AddBar stacks={stacks} urlSet={urlSet} rows={rows} onDone={refresh} />

      {/* legend + selection actions + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
          <span>Repeated company:</span>
          {OCC.map((o) => <span key={o.label} className={cn("rounded border px-1.5 py-0.5 text-[11px] font-medium", o.cls)}>{o.label}</span>)}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && <Button size="sm" onClick={copySelected}><Link2 className="size-3.5" /> Copy {selectedUrls.length} link{selectedUrls.length === 1 ? "" : "s"}</Button>}
          <Button size="sm" variant="outline" onClick={refresh} disabled={pending}>{pending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh</Button>
        </div>
      </div>

      {/* filters: date (server, default today) + BD/company/position (client) */}
      <div className="flex flex-wrap items-end gap-2">
        <DatePicker id="jb-date" label="Day" hint="The day the posts were added. Defaults to today." value={day} onChange={(v) => setParam({ date: v || null, page: null })} className="w-40" />
        <FloatSelect label="BD" value={fOwner} onChange={(e) => setFOwner(e.target.value)} wrapClassName="w-48">
          <option value="">All BDs</option>
          {bds.map((b) => <option key={b.id} value={b.id}>{bdName(b.id, b.label)}</option>)}
        </FloatSelect>
        <FloatInput id="jb-f-company" label="Company" value={fCompany} onChange={(e) => setFCompany(e.target.value)} wrapClassName="w-48" />
        <FloatInput id="jb-f-position" label="Position" value={fPosition} onChange={(e) => setFPosition(e.target.value)} wrapClassName="w-48" />
        <span className="pb-2 text-caption text-text-secondary">{filtered.length}{filtered.length !== rows.length ? ` of ${rows.length}` : ""} shown</span>
      </div>

      <Table>
        <THead>
          <TR>
            <TH className="w-[34px]"><input type="checkbox" className="size-4 accent-brand-primary" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></TH>
            <TH className="w-[34px]"></TH><TH>BD</TH><TH>Company</TH><TH>Position</TH><TH>Job post</TH><TH>Stack</TH><TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.map((r) => <Row key={r.id} r={r} meId={meId} stacks={stacks} occ={occStyle(companyCounts.get((r.company ?? "").trim().toLowerCase()) ?? 0)} selected={selected.has(r.id)} onSelect={() => toggleOne(r.id)} onPatch={patchRow} onDelete={deleteRow} />)}
          {filtered.length === 0 && <TR><TD colSpan={8} className="py-8 text-center text-text-secondary">No job posts for this day{fOwner || fCompany || fPosition ? " match the filters" : ""}. Add a link above to start.</TD></TR>}
        </TBody>
      </Table>

      {total > 0 && (
        <div className="flex items-center justify-between gap-3 text-caption text-text-secondary">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <NativeSelect value={String(pageSize)} onChange={(e) => setParam({ pageSize: e.target.value, page: null })} className="w-auto">
              {PER_PAGE.map((n) => <option key={n} value={n}>{n}</option>)}
            </NativeSelect>
          </div>
          <div className="flex items-center gap-3">
            <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })} className="inline-flex size-7 items-center justify-center rounded-md border border-border hover:bg-surface disabled:opacity-40" aria-label="Previous"><ChevronLeft className="size-4" /></button>
              <button type="button" disabled={page >= totalPages} onClick={() => setParam({ page: String(page + 1) })} className="inline-flex size-7 items-center justify-center rounded-md border border-border hover:bg-surface disabled:opacity-40" aria-label="Next"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Optimistically fold a patch body into a row (so the grid updates before the server confirms),
// including re-deriving the joined stack chip and a fresh "modified" time.
function mergeRow(r: any, body: any, stacks: any[]) {
  const next: any = { ...r, ...body, updated_at: new Date().toISOString() };
  if ("stack_id" in body) {
    const s = stacks.find((x) => x.id === body.stack_id);
    next.stack = s ? { name: s.name, color: s.color } : null;
  }
  return next;
}

function Row({ r, meId, stacks, occ, selected, onSelect, onPatch, onDelete }: { r: any; meId: string; stacks: any[]; occ: { cls: string } | null; selected: boolean; onSelect: () => void; onPatch: (id: string, body: any, ok?: string) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const mine = r.owner_bd_id === meId;
  const dim = !!r.dismissed;
  const patch = (body: any, ok = "Saved") => onPatch(r.id, body, ok);
  const del = () => onDelete(r.id);

  return (
    <>
      <TR className={dim ? "opacity-60" : undefined}>
        <TD><input type="checkbox" className="size-4 accent-brand-primary" checked={selected} onChange={onSelect} aria-label="Select row" /></TD>
        <TD className="pr-0"><button onClick={() => setOpen((o) => !o)} className="inline-flex size-6 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-brand-primary" aria-label="Expand">{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</button></TD>
        <TD>{mine ? <span className="rounded-full bg-brand-primary px-2 py-[1px] text-[11px] font-semibold text-white">You</span> : <ColorChip label={r.owner?.full_name} color={r.owner?.color} />}</TD>
        <TD className={dim ? "line-through" : undefined}>{r.company ? (occ ? <span className={cn("rounded border px-1.5 py-0.5 text-[13px] font-medium", occ.cls)}>{r.company}</span> : r.company) : <span className="text-text-secondary">—</span>}</TD>
        <TD className={cn("text-text-secondary", dim && "line-through")}>{r.position ?? "—"}</TD>
        <TD>{r.job_post_url ? (isUrl(r.job_post_url) ? <a href={r.job_post_url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[220px] items-center gap-1 truncate text-brand-primary hover:underline">{r.job_post_url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3 shrink-0" /></a> : <span className="max-w-[220px] truncate text-text-secondary">{r.job_post_url}</span>) : <span className="text-text-secondary">—</span>}</TD>
        <TD>{r.stack?.name ? <ColorChip label={r.stack.name} color={r.stack.color} /> : <span className="text-text-secondary">—</span>}</TD>
        <TD className="text-right">
          <span className="inline-flex items-center gap-1">
            {r.job_post_url && <button onClick={() => copy(r.job_post_url, "Link copied")} className="rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-brand-primary" title="Copy link"><Copy className="size-4" /></button>}
            {dim
              ? <button onClick={() => patch({ dismissed: false }, "Restored")} className="rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary" title="Restore"><RotateCcw className="size-4" /></button>
              : <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-text-secondary hover:bg-surface" title="Dismiss (expand to add a reason)"><EyeOff className="size-4" /></button>}
            {mine && <button onClick={del} className="rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-danger" title="Delete"><Trash2 className="size-4" /></button>}
          </span>
        </TD>
      </TR>
      {open && (
        <TR>
          <TD colSpan={8} className="bg-surface">
            <ExpandEditor r={r} mine={mine} stacks={stacks} onPatch={patch} onClose={() => setOpen(false)} />
          </TD>
        </TR>
      )}
    </>
  );
}

function ExpandEditor({ r, mine, stacks, onPatch, onClose }: { r: any; mine: boolean; stacks: any[]; onPatch: (b: any, ok?: string) => void; onClose: () => void }) {
  const [f, setF] = useState({ company: r.company ?? "", position: r.position ?? "", job_post_url: r.job_post_url ?? "", stack_id: r.stack_id ?? "", feedback: r.feedback ?? "" });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const dim = !!r.dismissed;
  // Save/dismiss/restore apply optimistically in the parent and close the editor immediately — no
  // waiting on the server (the change is already on-screen; failures revert + toast).
  const save = () => { onPatch(mine ? f : { feedback: f.feedback }); onClose(); };
  const dismiss = () => { onPatch({ dismissed: true, feedback: f.feedback || r.feedback }, "Dismissed"); onClose(); };
  const restore = () => { onPatch({ dismissed: false }, "Restored"); onClose(); };

  return (
    <div className="space-y-3 py-1">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FloatInput id={`jb-company-${r.id}`} label="Company" value={f.company} onChange={(e) => set("company", e.target.value)} disabled={!mine} />
        <FloatInput id={`jb-position-${r.id}`} label="Position" value={f.position} onChange={(e) => set("position", e.target.value)} disabled={!mine} />
        <FloatSelect id={`jb-stack-${r.id}`} label="Stack" value={f.stack_id} onChange={(e) => set("stack_id", e.target.value)} disabled={!mine}>
          <option value="">Not set</option>
          {stacks.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </FloatSelect>
        <FloatInput id={`jb-url-${r.id}`} label="Job post URL" value={f.job_post_url} onChange={(e) => set("job_post_url", e.target.value)} wrapClassName="lg:col-span-2" disabled={!mine} />
        <FloatInput id={`jb-feedback-${r.id}`} label="Feedback (shared)" hint="Any BD can add feedback, e.g. why it's dismissed, or a note about the post." value={f.feedback} onChange={(e) => set("feedback", e.target.value)} wrapClassName="lg:col-span-3" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save}>Save</Button>
        {dim
          ? <Button size="sm" variant="outline" onClick={restore}><RotateCcw className="size-3.5" /> Restore</Button>
          : <Button size="sm" variant="danger" onClick={dismiss}><EyeOff className="size-3.5" /> Dismiss</Button>}
        {!mine && <span className="text-caption text-text-secondary">You can edit only the shared feedback (and dismiss) on another BD&apos;s row.</span>}
      </div>
      <div className="flex flex-wrap gap-x-4 text-caption text-text-secondary">
        <span>Added {formatCrmDatetime(r.created_at)}</span>
        <span>Modified {formatCrmDatetime(r.updated_at)}</span>
        {dim && <span className="text-danger">Dismissed{r.dismisser?.full_name ? ` by ${r.dismisser.full_name}` : ""}{r.dismissed_at ? ` · ${formatCrmDatetime(r.dismissed_at)}` : ""}{r.feedback ? ` · ${r.feedback}` : ""}</span>}
      </div>
    </div>
  );
}

function AddBar({ stacks, urlSet, rows, onDone }: { stacks: any[]; urlSet: Set<string>; rows: any[]; onDone: () => void }) {
  const [mode, setMode] = useState<"one" | "bulk">("one");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ company: "", position: "", job_post_url: "", stack_id: "" });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const [bulk, setBulk] = useState("");

  const dupUrl = f.job_post_url.trim() && urlSet.has(f.job_post_url.trim().toLowerCase())
    ? rows.find((r) => (r.job_post_url ?? "").trim().toLowerCase() === f.job_post_url.trim().toLowerCase())
    : null;

  async function addOne() {
    if (!f.company.trim() && !f.position.trim() && !f.job_post_url.trim() && !f.stack_id) return toast.error("Add at least one detail");
    setBusy(true);
    const res = await fetch("/api/crm/job-hunts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    setBusy(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); return toast.error(j.error ?? "Failed"); }
    toast.success("Added"); setF({ company: "", position: "", job_post_url: "", stack_id: "" }); onDone();
  }
  async function addBulk() {
    if (!bulk.trim()) return toast.error("Paste some links");
    setBusy(true);
    const res = await fetch("/api/crm/job-hunts/bulk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: bulk }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(j.error ?? "Failed");
    const skipped = (j.dupInPaste ?? 0) + (j.alreadyOnBoard ?? 0);
    toast.success(`${j.added} added${skipped ? ` · ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""}`);
    setBulk(""); onDone();
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <div className="mb-3 inline-flex items-center rounded-lg border border-border bg-surface/50 p-0.5">
        {(["one", "bulk"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium", mode === m ? "bg-white text-brand-primary shadow-sm" : "text-text-secondary hover:text-text-primary")}>
            {m === "one" ? <><Plus className="size-3.5" /> Add one</> : <><ClipboardPaste className="size-3.5" /> Paste many links</>}
          </button>
        ))}
      </div>

      {mode === "one" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <FloatInput id="jb-company" label="Company" value={f.company} onChange={(e) => set("company", e.target.value)} wrapClassName="w-48" />
            <FloatInput id="jb-position" label="Position" value={f.position} onChange={(e) => set("position", e.target.value)} wrapClassName="w-52" />
            <FloatInput id="jb-url" label="Job post URL" value={f.job_post_url} onChange={(e) => set("job_post_url", e.target.value)} wrapClassName="min-w-[16rem] flex-1" />
            <FloatSelect id="jb-stack" label="Stack" value={f.stack_id} onChange={(e) => set("stack_id", e.target.value)} wrapClassName="w-40">
              <option value="">Not set</option>
              {stacks.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </FloatSelect>
            <Button size="sm" onClick={addOne} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add</Button>
          </div>
          {dupUrl && <p className="text-caption text-amber-600">Heads up: this link is already on the board{dupUrl.owner_bd_id ? ` (by ${dupUrl.owner?.full_name ?? "a BD"})` : ""}.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={4} placeholder="Paste job post URLs, one per line…" className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={addBulk} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ClipboardPaste className="size-4" />} Add links</Button>
            <span className="text-caption text-text-secondary">One URL per line. Duplicates (within the paste or already on the board) are skipped.</span>
          </div>
        </div>
      )}
    </div>
  );
}
