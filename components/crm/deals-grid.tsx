"use client";
import { useState } from "react";
import Link from "next/link";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronRight, SlidersHorizontal, Check } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { labelize, statusTone } from "@/lib/crm/constants";
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

export function DealsGrid({ rows }: { rows: any[] }) {
  // Optional columns, hidden by default (salary is sensitive; BD owner is space).
  const [cols, setCols] = useState<Record<string, boolean>>({ salary: false, owner: false });
  const toggle = (k: string) => setCols((c) => ({ ...c, [k]: !c[k] }));
  const colCount = 6 + (cols.salary ? 1 : 0) + (cols.owner ? 1 : 0);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <ColumnsMenu cols={cols} toggle={toggle} />
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Code</TH><TH>Company</TH><TH>Profile</TH><TH>Closer</TH>
            {cols.owner && <TH>BD owner</TH>}
            <TH>Working devs</TH>
            {cols.salary && <TH>Salary</TH>}
            <TH>Status</TH><TH></TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((d) => {
            const devs: any[] = d.developers ?? [];
            return (
              <TR key={d.id}>
                <TD className="tabular text-text-secondary">{formatCode(d.deal_code)}</TD>
                <TD className="font-medium">
                  <Link href={`/crm/deals/${d.id}`} className="text-text-primary hover:text-brand-primary">{d.name || d.lead?.company || "—"}</Link>
                </TD>
                <TD><ProfileCell p={d.profile ? { ...d.profile } : null} href={d.profile ? `/crm/profiles/${d.profile.id}` : undefined} /></TD>
                <TD><ColorChip label={d.closer?.full_name} color={d.closer?.color} /></TD>
                {cols.owner && <TD><ColorChip label={d.owner_bd?.full_name} color={d.owner_bd?.color} /></TD>}
                <TD>
                  {devs.length === 0
                    ? <span className="text-text-secondary">—</span>
                    : <span className="flex flex-wrap gap-1">
                        {devs.map((w) => <ColorChip key={w.id} label={w.full_name} color={w.color} />)}
                      </span>}
                </TD>
                {cols.salary && <TD className="tabular">{formatMoney(d.salary, d.currency)}</TD>}
                <TD><Badge tone={statusTone(d.status)}>{labelize(d.status)}</Badge></TD>
                <TD className="text-right"><Link href={`/crm/deals/${d.id}`} className="inline-flex text-text-secondary hover:text-brand-primary" aria-label="Open"><ChevronRight className="size-4" /></Link></TD>
              </TR>
            );
          })}
          {rows.length === 0 && <TR><TD colSpan={colCount + 1} className="py-6 text-center text-text-secondary">No deals yet.</TD></TR>}
        </TBody>
      </Table>
    </>
  );
}
