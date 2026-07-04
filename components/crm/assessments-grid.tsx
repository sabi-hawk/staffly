import { createClient } from "@/lib/supabase/server";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { CrmFilterBar } from "@/components/crm/filter-bar";
import { CrmDateFilter } from "@/components/crm/crm-date-filter";
import { ActivityRowActions } from "@/components/crm/activity-row-actions";
import { parsePaging } from "@/lib/pagination";
import { labelize, statusTone, ASSESSMENT_STATUS, PRIORITIES, DURATIONS } from "@/lib/crm/constants";
import { formatCrmDate } from "@/lib/utils";
import { companyToday } from "@/lib/time";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { page?: string; pageSize?: string; status?: string; priority?: string; duration?: string; q?: string; from?: string; to?: string };
const asDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const isoAgo = (offset: number) => { const d = new Date(Date.now() + 5 * 3600_000); d.setUTCDate(d.getUTCDate() - offset); return d.toISOString().slice(0, 10); };

/** Assessments tab of the CRM Leads hub — grid filtered by Received (entry_date, default 1 month). */
export async function AssessmentsGrid({ searchParams }: { searchParams: SP }) {
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);
  const today = companyToday();
  const rFrom = asDate(searchParams.from) ?? isoAgo(30); // default: last 1 month
  const rTo = asDate(searchParams.to) ?? isoAgo(0);

  let query = supabase
    .from("assessments")
    .select(
      "id, job_title, company, status, priority, duration, deadline, entry_date, created_at, updated_at, lead_id, profile:dev_profiles(name), owner:profiles!assessments_owner_bd_id_fkey(full_name)",
      { count: "exact" }
    );
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.priority) query = query.eq("priority", searchParams.priority);
  if (searchParams.duration) query = query.eq("duration", searchParams.duration);
  // strip PostgREST DSL metacharacters from q before interpolating into .or() (filter-injection guard)
  const q = searchParams.q?.replace(/[,()]/g, "").trim();
  if (q) query = query.or(`job_title.ilike.%${q}%,company.ilike.%${q}%`);
  query = query.gte("entry_date", rFrom).lte("entry_date", rTo);
  const { data: rows, count } = await query
    .order("entry_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  const list = (rows ?? []) as any[];

  return (
    <>
      <div className="mb-4 space-y-3 rounded-lg border border-border bg-surface/40 p-3">
        <CrmDateFilter />
        <div className="border-t border-border pt-3">
          <CrmFilterBar
            filters={[
              { key: "status", label: "Status", options: ASSESSMENT_STATUS.map((s) => ({ value: s, label: labelize(s) })) },
              { key: "priority", label: "Priority", options: PRIORITIES.map((s) => ({ value: s, label: s })) },
              { key: "duration", label: "Duration", options: DURATIONS.map((s) => ({ value: s, label: s })) },
            ]}
            search={{ key: "q", placeholder: "Search job or company" }}
          />
        </div>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Job / Company</TH><TH>BD</TH><TH>Status</TH><TH>Priority</TH><TH>Duration</TH>
            <TH>Received</TH><TH>Deadline</TH><TH>Entry</TH><TH>Modified</TH><TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {list.map((as) => {
            const overdue = as.deadline && as.deadline < today && !["completed", "cancelled"].includes(as.status);
            return (
              <TR key={as.id}>
                <TD className="font-medium">{as.job_title || "—"}<div className="text-caption text-text-secondary">{as.company}</div></TD>
                <TD className="text-text-secondary">{as.owner?.full_name ?? "—"}</TD>
                <TD><Badge tone={statusTone(as.status)}>{labelize(as.status)}</Badge></TD>
                <TD>{as.priority ? <Badge tone={as.priority === "high" ? "danger" : "neutral"}>{as.priority}</Badge> : "—"}</TD>
                <TD>{as.duration ?? "—"}</TD>
                <TD className="text-text-secondary">{formatCrmDate(as.entry_date)}</TD>
                <TD className={overdue ? "font-medium text-danger" : "text-text-secondary"}>{as.deadline ? formatCrmDate(as.deadline) : "—"}{overdue ? " · overdue" : ""}</TD>
                <TD className="text-text-secondary">{formatCrmDate(as.created_at)}</TD>
                <TD className="text-text-secondary">{formatCrmDate(as.updated_at)}</TD>
                <TD><ActivityRowActions kind="assessments" id={as.id} leadId={as.lead_id} /></TD>
              </TR>
            );
          })}
          {list.length === 0 && <TR><TD colSpan={10} className="py-6 text-center text-text-secondary">No assessments match.</TD></TR>}
        </TBody>
      </Table>
      <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
    </>
  );
}
