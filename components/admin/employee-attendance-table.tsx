"use client";
// Paginated daily-attendance table for the employee detail page. The parent loads the full range;
// this component paginates it client-side (the range itself is changed by RangeTabs on the server).
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/field";
import { PAGE_SIZES } from "@/components/ui/pagination";
import { formatHours, formatCrmDatetime } from "@/lib/utils";
import type { ReportDay } from "@/lib/services/reports";

export function EmployeeAttendanceTable({ daily }: { daily: ReportDay[] }) {
  const rows = [...daily].reverse(); // most recent first
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-3">
      <Table>
        <THead><TR><TH>Date</TH><TH>Hours</TH><TH>Deficit/Extra</TH><TH>Task summary</TH></TR></THead>
        <TBody>
          {slice.map((r) => {
            const summaryText = (r.daily_summary ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
            return (
              <TR key={r.work_date}>
                <TD className="tabular">{r.work_date}</TD>
                <TD className="tabular">{formatHours(r.total_hours)}</TD>
                <TD>
                  {Number(r.deficit_hours) > 0 && <Badge tone="danger">-{formatHours(r.deficit_hours)}</Badge>}
                  {Number(r.extra_hours) > 0 && <Badge tone="success">+{formatHours(r.extra_hours)}</Badge>}
                </TD>
                <TD className="max-w-[260px]">
                  {summaryText ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-text-secondary">{summaryText}</span>
                        {r.summary_late && <Badge tone="warning">late</Badge>}
                      </div>
                      {r.summary_late && r.summary_at && <div className="text-caption text-warning">added {formatCrmDatetime(r.summary_at)}</div>}
                    </div>
                  ) : r.check_in_time ? <Badge tone="warning">missing</Badge> : <span className="text-text-secondary">—</span>}
                </TD>
              </TR>
            );
          })}
          {rows.length === 0 && <TR><TD colSpan={4} className="py-6 text-center text-text-secondary">No attendance in this range.</TD></TR>}
        </TBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-text-secondary">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <NativeSelect value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8">
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </NativeSelect>
          <span className="tabular">{rows.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border border-border p-1.5 disabled:opacity-40" aria-label="Previous"><ChevronLeft className="size-4" /></button>
          <span className="px-2 tabular">Page {page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="rounded-md border border-border p-1.5 disabled:opacity-40" aria-label="Next"><ChevronRight className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}
