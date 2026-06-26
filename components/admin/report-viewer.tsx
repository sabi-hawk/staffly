"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/lib/utils";

export function ReportViewer({ employees }: { employees: { id: string; full_name: string }[] }) {
  const [id, setId] = useState(employees[0]?.id ?? "");
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await fetch(`/api/reports/employee?id=${id}&from=${from}&to=${to}`);
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    setReport(json);
  }

  function exportCsv() {
    if (!report) return;
    const rows = [["date", "hours", "deficit", "extra"]].concat(
      report.daily.map((d: any) => [d.work_date, d.total_hours ?? "", d.deficit_hours, d.extra_hours])
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report-${id}-${from}_${to}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Date-range report</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <select value={id} onChange={(e) => setId(e.target.value)} className="h-9 rounded-md border border-border bg-white px-3 text-sm">
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <Button onClick={run} disabled={busy}>{busy ? "Running…" : "Run report"}</Button>
            {report && <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>}
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Days worked / working" value={`${report.daysWorked}/${report.workingDays}`} />
            <StatCard label="Total hours" value={formatHours(report.totalHours)} />
            <StatCard label="Extra (gross)" value={formatHours(report.totalExtraHours)} tone="success" />
            <StatCard label="Deficit (gross)" value={formatHours(report.totalDeficitHours)} tone="danger" />
          </div>
          <Card>
            <CardHeader><CardTitle>Daily</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <THead><TR><TH>Date</TH><TH>Hours</TH><TH>Deficit/Extra</TH></TR></THead>
                <TBody>
                  {report.daily.map((d: any) => (
                    <TR key={d.work_date}>
                      <TD className="tabular">{d.work_date}</TD>
                      <TD className="tabular">{formatHours(d.total_hours)}</TD>
                      <TD>
                        {Number(d.deficit_hours) > 0 && <Badge tone="danger">-{formatHours(d.deficit_hours)}</Badge>}
                        {Number(d.extra_hours) > 0 && <Badge tone="success">+{formatHours(d.extra_hours)}</Badge>}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
