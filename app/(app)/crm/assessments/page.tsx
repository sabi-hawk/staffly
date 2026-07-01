import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { labelize, statusTone } from "@/lib/crm/constants";
import { companyToday } from "@/lib/time";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function CrmAssessmentsPage({ searchParams }: { searchParams: { page?: string; pageSize?: string } }) {
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);
  const today = companyToday(); // YYYY-MM-DD in Asia/Karachi
  const { data: rows, count } = await supabase
    .from("assessments")
    .select("id, job_title, company, status, priority, duration, deadline, lead_id, profile:dev_profiles(name), completed:profiles!assessments_completed_by_fkey(full_name)", { count: "exact" })
    .order("deadline", { ascending: true, nullsFirst: false })
    .range(from, to);
  const list = (rows ?? []) as any[];

  return (
    <Card>
      <CardHeader><CardTitle>Assessments ({count ?? 0})</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR><TH>Job / Company</TH><TH>Profile</TH><TH>Status</TH><TH>Priority</TH><TH>Duration</TH><TH>Deadline</TH><TH>Completed by</TH><TH></TH></TR>
          </THead>
          <TBody>
            {list.map((as) => {
              const overdue = as.deadline && as.deadline < today && !["completed", "cancelled"].includes(as.status);
              return (
                <TR key={as.id}>
                  <TD className="font-medium">{as.job_title || "—"}<div className="text-caption text-text-secondary">{as.company}</div></TD>
                  <TD>{as.profile?.name ?? "—"}</TD>
                  <TD><Badge tone={statusTone(as.status)}>{labelize(as.status)}</Badge></TD>
                  <TD>{as.priority ? <Badge tone={as.priority === "high" ? "danger" : "neutral"}>{as.priority}</Badge> : "—"}</TD>
                  <TD>{as.duration ?? "—"}</TD>
                  <TD className={overdue ? "font-medium text-danger" : ""}>{as.deadline ?? "—"}{overdue ? " · overdue" : ""}</TD>
                  <TD>{as.completed?.full_name ?? "—"}</TD>
                  <TD className="text-right">{as.lead_id && <Link href={`/crm/leads/${as.lead_id}`} className="text-caption text-brand-primary hover:underline">Open lead</Link>}</TD>
                </TR>
              );
            })}
            {list.length === 0 && <TR><TD colSpan={8} className="py-6 text-center text-text-secondary">No assessments yet.</TD></TR>}
          </TBody>
        </Table>
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
      </CardContent>
    </Card>
  );
}
