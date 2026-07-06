"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { FloatSelect } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { PAGE_SIZES } from "@/components/ui/pagination";
import { formatHours } from "@/lib/utils";
import type { EmployeeReport, ReportDay } from "@/lib/services/reports";

export function ReportViewer({ employees }: { employees: { id: string; full_name: string; employee_code: string | null }[] }) {
  const [id, setId] = useState(employees[0]?.id ?? "");
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
  const [report, setReport] = useState<EmployeeReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function run() {
    setBusy(true);
    const res = await fetch(`/api/reports/employee?id=${id}&from=${from}&to=${to}`);
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    setReport(json);
    setPage(1);
  }

  function exportCsv() {
    if (!report) return;
    // summary header rows (leaves/missing were on screen but not exported — QA fix), then the daily rows
    const byType = Object.entries(report.leavesByType ?? {}).map(([t, n]) => `${t}:${n}`).join(" ");
    const rows = [
      ["summary", "working_days", String(report.workingDays), "days_worked", String(report.daysWorked)],
      ["summary", "leave_days", String(report.leaveDays), "leaves_by_type", byType || "-"],
      ["summary", "missing_days", String(report.missingDays), "total_hours", String(report.totalHours)],
      [],
      ["date", "status", "hours", "deficit", "extra"],
    ].concat(
      report.daily.map((d) => [d.work_date, d.status ?? "", String(d.total_hours ?? ""), String(d.deficit_hours), String(d.extra_hours)])
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report-${id}-${from}_${to}.csv`;
    a.click();
  }

  const daily: ReportDay[] = report?.daily ?? [];
  const pages = Math.max(1, Math.ceil(daily.length / pageSize));
  const slice = daily.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Date-range report</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <FloatSelect
              id="report-employee"
              label="Employee"
              hint="The employee the report is generated for."
              value={id}
              onChange={(e) => setId(e.target.value)}
              wrapClassName="w-64"
            >
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}{e.employee_code ? ` (#${e.employee_code})` : ""}</option>)}
            </FloatSelect>
            <DatePicker id="report-from" label="From" hint="Start of the report range." value={from} onChange={setFrom} className="w-40" />
            <DatePicker id="report-to" label="To" hint="End of the report range." value={to} onChange={setTo} className="w-40" />
            <Button onClick={run} disabled={busy}>{busy ? "Running…" : "Run report"}</Button>
            {report && <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>}
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard label="Days worked / working" value={`${report.daysWorked}/${report.workingDays}`} />
            <StatCard label="Total hours" value={formatHours(report.totalHours)} />
            <StatCard label="Extra (gross)" value={formatHours(report.totalExtraHours)} tone="success" />
            <StatCard label="Deficit (gross)" value={formatHours(report.totalDeficitHours)} tone="danger" />
            <StatCard label="Leaves" value={report.leaveDays} tone="neutral" />
            <StatCard label="Missing days" value={report.missingDays} tone="warning" />
          </div>

          {Object.keys(report.leavesByType ?? {}).length > 0 && (
            <Card>
              <CardContent className="flex flex-wrap gap-2 pt-5">
                <span className="text-caption text-text-secondary">Leaves by type:</span>
                {Object.entries(report.leavesByType).map(([t, n]) => (
                  <Badge key={t} tone="info">{t}: {n as number}</Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Daily</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <THead><TR><TH>Date</TH><TH>In</TH><TH>Out</TH><TH>Hours</TH><TH>Deficit/Extra</TH></TR></THead>
                <TBody>
                  {slice.map((d) => (
                    <TR key={d.work_date}>
                      <TD className="tabular">{d.work_date}</TD>
                      <TD className="tabular">{d.check_in_time ? new Date(d.check_in_time).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—"}</TD>
                      <TD className="tabular">{d.check_out_time ? new Date(d.check_out_time).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" }) : "—"}</TD>
                      <TD className="tabular">{formatHours(d.total_hours)}</TD>
                      <TD>
                        {Number(d.deficit_hours) > 0 && <Badge tone="danger">-{formatHours(d.deficit_hours)}</Badge>}
                        {Number(d.extra_hours) > 0 && <Badge tone="success">+{formatHours(d.extra_hours)}</Badge>}
                      </TD>
                    </TR>
                  ))}
                  {slice.length === 0 && <TR><TD className="py-6 text-center text-text-secondary">No attendance in range.</TD></TR>}
                </TBody>
              </Table>
              {/* local pagination for the loaded daily array */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-caption text-text-secondary">
                <div className="flex items-center gap-2">
                  <Label htmlFor="report-page-size" className="font-normal text-text-secondary">Rows per page</Label>
                  <select id="report-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="h-8 rounded-md border border-border bg-white px-2 text-sm">
                    {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="tabular">{daily.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, daily.length)} of {daily.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border p-1.5 disabled:opacity-40 hover:bg-surface"><ChevronLeft className="size-4" /></button>
                  <span className="px-2 tabular">{page} / {pages}</span>
                  <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border p-1.5 disabled:opacity-40 hover:bg-surface"><ChevronRight className="size-4" /></button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
