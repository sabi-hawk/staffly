"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/lib/types";
import { entityLabel, fieldLabel, formatValue, summaryLine, actionVerb } from "@/lib/audit/labels";

const SKIP = new Set(["updated_at", "created_at", "id"]);

/* eslint-disable @typescript-eslint/no-explicit-any */
function diffFields(before: any, after: any): { key: string; from: any; to: any }[] {
  const keys = Array.from(new Set(Object.keys(before ?? {}).concat(Object.keys(after ?? {}))));
  const out: { key: string; from: any; to: any }[] = [];
  for (const k of keys) {
    if (SKIP.has(k)) continue;
    if (JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])) out.push({ key: k, from: before?.[k], to: after?.[k] });
  }
  return out;
}

function snapshotFields(snap: any): { key: string; value: any }[] {
  return Object.keys(snap ?? {})
    .filter((k) => !SKIP.has(k) && snap[k] !== null && snap[k] !== undefined && snap[k] !== "")
    .map((k) => ({ key: k, value: snap[k] }));
}

const actionTone = (a: string) =>
  a.includes("delete") ? "danger" : a.includes("insert") ? "success" : a.includes("download") ? "brand" : "warning";

// Module-scope row so React keeps identity across parent re-renders (no remount on expand/collapse).
function AuditRow({ r, expanded, onToggle, nameMap }: { r: AuditLog; expanded: boolean; onToggle: () => void; nameMap?: Record<string, string> }) {
  const fields = r.action === "update" ? diffFields(r.before, r.after) : [];
  const snapshot = r.action === "insert" ? r.after : r.action === "delete" ? r.before : null;
  const hasDetail = fields.length > 0 || !!snapshot;
  return (
    <>
      <TR>
        <TD>
          {hasDetail ? (
            <button onClick={onToggle} className="text-text-secondary hover:text-brand-primary" aria-label="Toggle details">
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ) : null}
        </TD>
        <TD className="tabular text-caption whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</TD>
        <TD className="text-sm">{r.actor_email ?? "System"}<span className="ml-1 text-caption text-text-secondary capitalize">{r.actor_role ? `(${r.actor_role.replace("_", " ")})` : ""}</span></TD>
        <TD><Badge tone={actionTone(r.action) as any}>{actionVerb(r.action)}</Badge></TD>
        <TD className="text-sm">{entityLabel(r.entity)}</TD>
        <TD className="text-caption text-text-secondary">{summaryLine({ actor_email: r.actor_email, action: r.action, entity: r.entity, changedCount: fields.length })}</TD>
      </TR>
      {expanded && hasDetail && (
        <TR>
          <TD colSpan={6} className="bg-surface">
            {fields.length > 0 && (
              <table className="w-full text-caption">
                <thead><tr className="text-text-secondary"><th className="py-1 text-left">Field</th><th className="py-1 text-left">Previous</th><th className="py-1 text-left">New</th></tr></thead>
                <tbody>
                  {fields.map((f) => (
                    <tr key={f.key} className="border-t border-border">
                      <td className="py-1 pr-3 font-medium">{fieldLabel(f.key)}</td>
                      <td className="py-1 pr-3 text-danger">{formatValue(f.key, f.from, nameMap)}</td>
                      <td className="py-1 text-success">{formatValue(f.key, f.to, nameMap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {snapshot && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-caption sm:grid-cols-3">
                {snapshotFields(snapshot).map((f) => (
                  <div key={f.key}><dt className="text-text-secondary">{fieldLabel(f.key)}</dt><dd>{formatValue(f.key, f.value, nameMap)}</dd></div>
                ))}
              </dl>
            )}
          </TD>
        </TR>
      )}
    </>
  );
}

export function LogsTable({ rows, nameMap }: { rows: AuditLog[]; nameMap?: Record<string, string> }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Table>
      <THead>
        <TR><TH></TH><TH>When</TH><TH>Who</TH><TH>Action</TH><TH>What</TH><TH>Summary</TH></TR>
      </THead>
      <TBody>
        {rows.map((r) => (
          <AuditRow key={r.id} r={r} expanded={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} nameMap={nameMap} />
        ))}
        {rows.length === 0 && <TR><TD colSpan={6} className="py-6 text-center text-text-secondary">No activity yet.</TD></TR>}
      </TBody>
    </Table>
  );
}
