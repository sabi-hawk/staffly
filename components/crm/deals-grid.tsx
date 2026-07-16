"use client";
import { useState } from "react";
import Link from "next/link";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronRight, ChevronDown, SlidersHorizontal, Check, Building2 } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { labelize, statusTone, rateSuffix } from "@/lib/crm/constants";
import { formatMoney, formatCode } from "@/lib/utils";
import { ColorChip, ProfileCell } from "@/components/crm/crm-cells";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Optional columns off by default; toggled from the Columns menu. Salary is sensitive; BD owner just
// saves horizontal space when you don't need it.
function ColumnsMenu({ cols, toggle }: { cols: Record<string, boolean>; toggle: (k: string) => void }) {
  const items = [{ key: "salary", label: "Salary" }, { key: "owner", label: "BD owner" }];
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-caption text-text-secondary hover:bg-surface">
        <SlidersHorizontal className="size-3.5" /> Columns
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align="end" sideOffset={6} className="z-50 w-44 rounded-xl border border-border bg-card p-1 shadow-soft">
          <div className="px-2 py-1 text-caption font-medium text-text-secondary">Show columns</div>
          {items.map((it) => (
            <button key={it.key} type="button" onClick={() => toggle(it.key)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface">
              <span className="w-4">{cols[it.key] && <Check className="size-4 text-brand-primary" />}</span>
              {it.label}
            </button>
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

type Group = { company: string; deals: any[] };

// Roll deals up by their company name (name, or the linked lead's company). Case-insensitive key so
// "Acme" and "acme" land together; the first spelling seen is the display label.
function groupByCompany(rows: any[]): Group[] {
  const map = new Map<string, Group>();
  for (const d of rows) {
    const company = (d.name || d.lead?.company || "—").toString();
    const key = company.trim().toLowerCase() || "—";
    if (!map.has(key)) map.set(key, { company, deals: [] });
    map.get(key)!.deals.push(d);
  }
  // Companies with the most deals first (the rolled-up ones the user cares about), then alphabetical.
  return Array.from(map.values()).sort((a, b) => b.deals.length - a.deals.length || a.company.localeCompare(b.company));
}

// Short "3 active · 1 ended" summary for a collapsed group header.
function statusSummary(deals: any[]): string {
  const counts: Record<string, number> = {};
  for (const d of deals) counts[d.status] = (counts[d.status] ?? 0) + 1;
  return Object.entries(counts).map(([s, n]) => `${n} ${labelize(s).toLowerCase()}`).join(" · ");
}

function DealRows({ deals, cols }: { deals: any[]; cols: Record<string, boolean> }) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Code</TH><TH>Designation</TH><TH>Profile</TH><TH>Closer</TH>
          {cols.owner && <TH>BD owner</TH>}
          <TH>Working members</TH>
          {cols.salary && <TH>Salary</TH>}
          <TH>Status</TH><TH></TH>
        </TR>
      </THead>
      <TBody>
        {deals.map((d) => {
          const devs: any[] = d.developers ?? [];
          return (
            <TR key={d.id}>
              <TD className="tabular text-text-secondary">{formatCode(d.deal_code)}</TD>
              <TD className="font-medium">
                <Link href={`/crm/deals/${d.id}`} className="text-text-primary hover:text-brand-primary">{d.designation || "—"}</Link>
              </TD>
              <TD><ProfileCell p={d.profile ? { ...d.profile } : null} href={d.profile ? `/crm/profiles/${d.profile.id}` : undefined} /></TD>
              <TD><ColorChip label={d.closer?.full_name} color={d.closer?.color} /></TD>
              {cols.owner && <TD><span className="flex flex-wrap gap-1">
                <ColorChip label={d.owner_bd?.full_name} color={d.owner_bd?.color} />
                {d.secondary_owner_bd && <ColorChip label={d.secondary_owner_bd.full_name} color={d.secondary_owner_bd.color} />}
              </span></TD>}
              <TD>
                {devs.length === 0
                  ? <span className="text-text-secondary">—</span>
                  : <span className="flex flex-wrap gap-1">{devs.map((w) => <ColorChip key={w.id} label={w.full_name} color={w.color} />)}</span>}
              </TD>
              {cols.salary && <TD className="tabular">{d.salary != null ? <>{formatMoney(d.salary, d.currency)}<span className="text-text-secondary">{rateSuffix(d.rate_type)}</span></> : "—"}</TD>}
              <TD><Badge tone={statusTone(d.status)}>{labelize(d.status)}</Badge></TD>
              <TD className="text-right"><Link href={`/crm/deals/${d.id}`} className="inline-flex text-text-secondary hover:text-brand-primary" aria-label="Open"><ChevronRight className="size-4" /></Link></TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}

export function DealsGrid({ rows }: { rows: any[] }) {
  const [cols, setCols] = useState<Record<string, boolean>>({ salary: false, owner: false });
  const toggle = (k: string) => setCols((c) => ({ ...c, [k]: !c[k] }));
  const groups = groupByCompany(rows);
  // Single-deal companies open by default (nothing to roll up); multi-deal ones collapse to one record.
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.filter((g) => g.deals.length === 1).map((g) => g.company.toLowerCase())));
  const toggleGroup = (key: string) => setOpen((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const allKeys = groups.map((g) => g.company.toLowerCase());
  const allOpen = open.size >= groups.length;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-caption text-text-secondary">{groups.length} {groups.length === 1 ? "company" : "companies"} · {rows.length} {rows.length === 1 ? "deal" : "deals"}</span>
        <div className="flex items-center gap-2">
          {groups.some((g) => g.deals.length > 1) && (
            <button type="button" onClick={() => setOpen(allOpen ? new Set() : new Set(allKeys))} className="rounded-md border border-border px-2.5 py-1 text-caption text-text-secondary hover:bg-surface">
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
          <ColumnsMenu cols={cols} toggle={toggle} />
        </div>
      </div>

      {groups.length === 0 && <div className="rounded-lg border border-border py-8 text-center text-text-secondary">No deals yet.</div>}

      <div className="space-y-2">
        {groups.map((g) => {
          const key = g.company.toLowerCase();
          const isOpen = open.has(key);
          const multi = g.deals.length > 1;
          return (
            <div key={key} className="overflow-hidden rounded-lg border border-border">
              <button type="button" onClick={() => toggleGroup(key)} className="flex w-full items-center gap-3 bg-surface/40 px-3 py-2.5 text-left hover:bg-surface">
                {isOpen ? <ChevronDown className="size-4 shrink-0 text-text-secondary" /> : <ChevronRight className="size-4 shrink-0 text-text-secondary" />}
                <Building2 className="size-4 shrink-0 text-text-secondary" />
                <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{g.company}</span>
                <Badge tone={multi ? "brand" : "neutral"}>{g.deals.length} {g.deals.length === 1 ? "deal" : "deals"}</Badge>
                <span className="hidden shrink-0 text-caption text-text-secondary sm:inline">{statusSummary(g.deals)}</span>
              </button>
              {isOpen && <div className="border-t border-border p-1"><DealRows deals={g.deals} cols={cols} /></div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
