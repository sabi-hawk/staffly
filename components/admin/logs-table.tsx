"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/lib/types";

// Fields not worth showing in a diff.
const SKIP = new Set(["updated_at", "created_at", "id"]);

function diffFields(before: any, after: any): { key: string; from: any; to: any }[] {
  const keys = Array.from(new Set(Object.keys(before ?? {}).concat(Object.keys(after ?? {}))));
  const out: { key: string; from: any; to: any }[] = [];
  for (const k of keys) {
    if (SKIP.has(k)) continue;
    const f = before?.[k];
    const t = after?.[k];
    if (JSON.stringify(f) !== JSON.stringify(t)) out.push({ key: k, from: f, to: t });
  }
  return out;
}

const fmt = (v: any) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

const actionTone = (a: string) =>
  a.includes("delete") ? "danger" : a.includes("insert") || a.includes("approved") ? "success" : "warning";

export function LogsTable({ rows }: { rows: AuditLog[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Table>
      <THead>
        <TR><TH></TH><TH>When</TH><TH>Actor</TH><TH>Action</TH><TH>Entity</TH><TH>Changes</TH></TR>
      </THead>
      <TBody>
        {rows.map((r) => {
          const expanded = open === r.id;
          const fields = r.action === "update" ? diffFields(r.before, r.after) : [];
          const snapshot = r.action === "insert" ? r.after : r.action === "delete" ? r.before : null;
          return (
            <RowFragment
              key={r.id}
              r={r}
              expanded={expanded}
              onToggle={() => setOpen(expanded ? null : r.id)}
              fields={fields}
              snapshot={snapshot}
            />
          );
        })}
        {rows.length === 0 && <TR><TD className="py-6 text-center text-text-secondary">No activity logged yet.</TD></TR>}
      </TBody>
    </Table>
  );

  function RowFragment({ r, expanded, onToggle, fields, snapshot }: any) {
    return (
      <>
        <TR className="cursor-pointer" >
          <TD>
            <button onClick={onToggle} className="text-text-secondary hover:text-brand-primary">
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          </TD>
          <TD className="tabular text-caption">{new Date(r.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</TD>
          <TD>{r.actor_email ?? "—"}<span className="ml-1 text-caption text-text-secondary capitalize">{r.actor_role ? `(${r.actor_role.replace("_", " ")})` : ""}</span></TD>
          <TD><Badge tone={actionTone(r.action) as any}>{r.action}</Badge></TD>
          <TD className="text-text-secondary">{r.entity}</TD>
          <TD className="text-caption text-text-secondary">{r.action === "update" ? `${fields.length} field(s)` : r.action}</TD>
        </TR>
        {expanded && (
          <TR>
            <TD colSpan={6} className="bg-surface">
              {r.action === "update" && (
                <table className="w-full text-caption">
                  <thead><tr className="text-text-secondary"><th className="py-1 text-left">Field</th><th className="py-1 text-left">Previous</th><th className="py-1 text-left">New</th></tr></thead>
                  <tbody>
                    {fields.map((f: any) => (
                      <tr key={f.key} className="border-t border-border">
                        <td className="py-1 pr-3 font-medium">{f.key}</td>
                        <td className="py-1 pr-3 text-danger">{fmt(f.from)}</td>
                        <td className="py-1 text-success">{fmt(f.to)}</td>
                      </tr>
                    ))}
                    {fields.length === 0 && <tr><td className="py-1 text-text-secondary" colSpan={3}>No field changes.</td></tr>}
                  </tbody>
                </table>
              )}
              {snapshot && (
                <pre className="overflow-auto whitespace-pre-wrap text-[11px] text-text-secondary">{JSON.stringify(snapshot, null, 2)}</pre>
              )}
            </TD>
          </TR>
        )}
      </>
    );
  }
}
