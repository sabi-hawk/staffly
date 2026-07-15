"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Eye, EyeOff } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { labelize, statusTone } from "@/lib/crm/constants";
import { formatMoney, formatCode } from "@/lib/utils";
import { ColoredName, ProfileCell } from "@/components/crm/crm-cells";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function DealsGrid({ rows }: { rows: any[] }) {
  // Salary is HIDDEN by default; a super admin flips it on when they want to see the money column.
  const [showSalary, setShowSalary] = useState(false);
  const cols = 6 + (showSalary ? 1 : 0);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setShowSalary((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-caption text-text-secondary hover:bg-surface"
        >
          {showSalary ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {showSalary ? "Hide salary" : "Show salary"}
        </button>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Code</TH><TH>Company</TH><TH>Profile</TH><TH>Closer</TH><TH>Working devs</TH>
            {showSalary && <TH>Salary</TH>}
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
                <TD><ColoredName name={d.closer?.full_name} color={d.closer?.color} /></TD>
                <TD>
                  {devs.length === 0
                    ? <span className="text-text-secondary">—</span>
                    : <span className="flex flex-wrap gap-1">
                        {devs.map((w) => (
                          <span key={w.id} className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-caption font-medium"
                            style={{ color: w.color || "#475569", borderColor: `${w.color || "#475569"}55`, backgroundColor: `${w.color || "#475569"}12` }}>
                            {w.full_name}
                          </span>
                        ))}
                      </span>}
                </TD>
                {showSalary && <TD className="tabular">{formatMoney(d.salary, d.currency)}</TD>}
                <TD><Badge tone={statusTone(d.status)}>{labelize(d.status)}</Badge></TD>
                <TD className="text-right"><Link href={`/crm/deals/${d.id}`} className="inline-flex text-text-secondary hover:text-brand-primary" aria-label="Open"><ChevronRight className="size-4" /></Link></TD>
              </TR>
            );
          })}
          {rows.length === 0 && <TR><TD colSpan={cols + 1} className="py-6 text-center text-text-secondary">No deals yet.</TD></TR>}
        </TBody>
      </Table>
    </>
  );
}
