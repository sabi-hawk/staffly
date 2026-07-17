"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronRight, ChevronDown, ChevronLeft, SlidersHorizontal, Check, Building2, LayoutList, LayoutGrid } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/field";
import { labelize, statusTone, rateSuffix } from "@/lib/crm/constants";
import { formatMoney, formatCode, cn } from "@/lib/utils";
import { ColorChip, ProfileCell } from "@/components/crm/crm-cells";

/* eslint-disable @typescript-eslint/no-explicit-any */

const companyName = (d: any) => (d.name || d.lead?.company || "—").toString();

// Column definitions — shared by the grouped "card" tables AND the flat "grid" table so every column
// lines up. table-fixed + these widths keep separate group tables perfectly aligned.
type Col = { key: string; header: string; width: string; tdClass?: string; render: (d: any) => ReactNode };

function buildColumns(cols: Record<string, boolean>, withCompany: boolean): Col[] {
  const c: Col[] = [];
  if (withCompany) c.push({ key: "company", header: "Company", width: "w-[15%]", render: (d) => <Link href={`/crm/deals/${d.id}`} className="truncate font-medium text-text-primary hover:text-brand-primary">{companyName(d)}</Link> });
  c.push({ key: "code", header: "Code", width: "w-[84px]", render: (d) => <span className="tabular text-text-secondary">{formatCode(d.deal_code)}</span> });
  c.push({ key: "designation", header: "Designation", width: "w-[15%]", render: (d) => <Link href={`/crm/deals/${d.id}`} className="block truncate font-medium text-text-primary hover:text-brand-primary">{d.designation || "—"}</Link> });
  c.push({ key: "profile", header: "Profile", width: withCompany ? "w-[22%]" : "w-[26%]", render: (d) => <ProfileCell p={d.profile ? { ...d.profile } : null} href={d.profile ? `/crm/profiles/${d.profile.id}` : undefined} /> });
  c.push({ key: "closer", header: "Closer", width: "w-[12%]", render: (d) => <ColorChip label={d.closer?.full_name} color={d.closer?.color} /> });
  if (cols.owner) c.push({ key: "owner", header: "BD owner", width: "w-[13%]", render: (d) => <span className="flex flex-wrap gap-1"><ColorChip label={d.owner_bd?.full_name} color={d.owner_bd?.color} />{d.secondary_owner_bd && <ColorChip label={d.secondary_owner_bd.full_name} color={d.secondary_owner_bd.color} />}</span> });
  c.push({ key: "members", header: "Working members", width: "w-[16%]", render: (d) => {
    const devs: any[] = d.developers ?? [];
    return devs.length === 0 ? <span className="text-text-secondary">—</span> : <span className="flex flex-wrap gap-1">{devs.map((w) => <ColorChip key={w.id} label={w.full_name} color={w.color} />)}</span>;
  } });
  if (cols.salary) c.push({ key: "salary", header: "Salary", width: "w-[11%]", render: (d) => d.salary != null ? <span className="tabular">{formatMoney(d.salary, d.currency)}<span className="text-text-secondary">{rateSuffix(d.rate_type)}</span></span> : <span className="text-text-secondary">—</span> });
  c.push({ key: "status", header: "Status", width: "w-[96px]", render: (d) => <Badge tone={statusTone(d.status)}>{labelize(d.status)}</Badge> });
  c.push({ key: "chevron", header: "", width: "w-[40px]", tdClass: "text-right", render: (d) => <Link href={`/crm/deals/${d.id}`} className="inline-flex text-text-secondary hover:text-brand-primary" aria-label="Open"><ChevronRight className="size-4" /></Link> });
  return c;
}

function DealTable({ columns, rows, hideHeader }: { columns: Col[]; rows: any[]; hideHeader?: boolean }) {
  return (
    <Table className="table-fixed">
      {!hideHeader && (
        <THead>
          <TR className="hover:bg-transparent">{columns.map((c) => <TH key={c.key} className={c.width}>{c.header}</TH>)}</TR>
        </THead>
      )}
      <TBody>
        {rows.map((d) => (
          <TR key={d.id}>{columns.map((c) => <TD key={c.key} className={cn(c.width, c.tdClass)}>{c.render(d)}</TD>)}</TR>
        ))}
      </TBody>
    </Table>
  );
}

// Optional columns off by default; toggled from the Columns menu.
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
function groupByCompany(rows: any[]): Group[] {
  const map = new Map<string, Group>();
  for (const d of rows) {
    const company = companyName(d);
    const key = company.trim().toLowerCase() || "—";
    if (!map.has(key)) map.set(key, { company, deals: [] });
    map.get(key)!.deals.push(d);
  }
  return Array.from(map.values()).sort((a, b) => b.deals.length - a.deals.length || a.company.localeCompare(b.company));
}
function statusSummary(deals: any[]): string {
  const counts: Record<string, number> = {};
  for (const d of deals) counts[d.status] = (counts[d.status] ?? 0) + 1;
  return Object.entries(counts).map(([s, n]) => `${n} ${labelize(s).toLowerCase()}`).join(" · ");
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function DealsGrid({ rows }: { rows: any[] }) {
  const [view, setView] = useState<"cards" | "grid">("cards");
  const [cols, setCols] = useState<Record<string, boolean>>({ salary: false, owner: false });
  const toggle = (k: string) => setCols((c) => ({ ...c, [k]: !c[k] }));
  const groups = groupByCompany(rows);
  const [open, setOpen] = useState<Set<string>>(new Set()); // collapsed by default

  const toggleGroup = (key: string) => setOpen((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  // Pagination: by COMPANY in cards view, by DEAL in grid view.
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [view, perPage]);
  const units = view === "cards" ? groups.length : rows.length;
  const totalPages = Math.max(1, Math.ceil(units / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * perPage;

  const pageGroups = groups.slice(start, start + perPage);
  const pageRows = rows.slice(start, start + perPage);
  const pageKeys = pageGroups.map((g) => g.company.toLowerCase());
  const allOpen = pageKeys.length > 0 && pageKeys.every((k) => open.has(k));

  const cardCols = buildColumns(cols, false);
  const gridCols = buildColumns(cols, true);

  const Toggle = (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      <button type="button" onClick={() => setView("cards")} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-caption", view === "cards" ? "bg-brand-primary/10 text-brand-primary" : "text-text-secondary hover:bg-surface")} aria-pressed={view === "cards"}><LayoutList className="size-3.5" /> Cards</button>
      <button type="button" onClick={() => setView("grid")} className={cn("inline-flex items-center gap-1.5 border-l border-border px-2.5 py-1 text-caption", view === "grid" ? "bg-brand-primary/10 text-brand-primary" : "text-text-secondary hover:bg-surface")} aria-pressed={view === "grid"}><LayoutGrid className="size-3.5" /> Grid</button>
    </div>
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-caption text-text-secondary">{groups.length} {groups.length === 1 ? "company" : "companies"} · {rows.length} {rows.length === 1 ? "deal" : "deals"}</span>
        <div className="flex items-center gap-2">
          {view === "cards" && pageGroups.some((g) => g.deals.length > 1) && (
            <button type="button" onClick={() => setOpen((s) => { const n = new Set(s); if (allOpen) pageKeys.forEach((k) => n.delete(k)); else pageKeys.forEach((k) => n.add(k)); return n; })} className="rounded-md border border-border px-2.5 py-1 text-caption text-text-secondary hover:bg-surface">
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
          {Toggle}
          <ColumnsMenu cols={cols} toggle={toggle} />
        </div>
      </div>

      {groups.length === 0 && <div className="rounded-lg border border-border py-8 text-center text-text-secondary">No deals yet.</div>}

      {view === "grid" ? (
        groups.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <DealTable columns={gridCols} rows={pageRows} />
          </div>
        )
      ) : (
        <div className="space-y-1.5">
          {pageGroups.map((g) => {
            const key = g.company.toLowerCase();
            const isOpen = open.has(key);
            const multi = g.deals.length > 1;
            return (
              <div key={key} className="overflow-hidden rounded-lg border border-border">
                <button type="button" onClick={() => toggleGroup(key)} className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface/60">
                  {isOpen ? <ChevronDown className="size-4 shrink-0 text-text-secondary" /> : <ChevronRight className="size-4 shrink-0 text-text-secondary transition-transform group-hover:translate-x-0.5" />}
                  <Building2 className="size-3.5 shrink-0 text-text-secondary/70" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{g.company}</span>
                  <span className="hidden shrink-0 text-[11px] text-text-secondary/80 sm:inline">{statusSummary(g.deals)}</span>
                  <span className={cn("inline-flex shrink-0 items-baseline gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", multi ? "bg-brand-primary/10 text-brand-primary" : "bg-surface text-text-secondary")}>
                    {g.deals.length}<span className="font-normal opacity-60">{g.deals.length === 1 ? "deal" : "deals"}</span>
                  </span>
                </button>
                {isOpen && <div className="border-t border-border p-1"><DealTable columns={cardCols} rows={g.deals} /></div>}
              </div>
            );
          })}
        </div>
      )}

      {units > perPage && (
        <div className="mt-3 flex items-center justify-between gap-3 text-caption text-text-secondary">
          <div className="flex items-center gap-2">
            <span>{view === "cards" ? "Companies" : "Deals"} per page</span>
            <NativeSelect value={String(perPage)} onChange={(e) => setPerPage(Number(e.target.value))} className="w-auto">
              {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </NativeSelect>
          </div>
          <div className="flex items-center gap-3">
            <span>{start + 1}–{Math.min(start + perPage, units)} of {units}</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="inline-flex size-7 items-center justify-center rounded-md border border-border hover:bg-surface disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="size-4" /></button>
              <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)} className="inline-flex size-7 items-center justify-center rounded-md border border-border hover:bg-surface disabled:opacity-40" aria-label="Next page"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
