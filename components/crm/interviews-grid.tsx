import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { CrmFilterBar } from "@/components/crm/filter-bar";
import { CrmDateFilter } from "@/components/crm/crm-date-filter";
import { parsePaging } from "@/lib/pagination";
import { labelize, statusTone, INTERVIEW_STATUS, INTERVIEW_ROUND, INTERVIEW_OUTCOME } from "@/lib/crm/constants";
import { formatCrmDatetime, formatCrmDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { page?: string; pageSize?: string; status?: string; round?: string; outcome?: string; q?: string; from?: string; to?: string };
const asDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

/** Interviews tab of the CRM Leads hub — grid filtered by Received date, with Entry/Modified columns. */
export async function InterviewsGrid({ searchParams }: { searchParams: SP }) {
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);
  const rFrom = asDate(searchParams.from);
  const rTo = asDate(searchParams.to);

  let query = supabase
    .from("interviews")
    .select(
      "id, job_title, company, status, round, outcome, interview_at, received_date, created_at, updated_at, lead_id, profile:dev_profiles(name), owner:profiles!interviews_owner_bd_id_fkey(full_name)",
      { count: "exact" }
    );
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.round) query = query.eq("round", searchParams.round);
  if (searchParams.outcome) query = query.eq("outcome", searchParams.outcome);
  if (searchParams.q) query = query.or(`job_title.ilike.%${searchParams.q}%,company.ilike.%${searchParams.q}%`);
  if (rFrom) query = query.gte("received_date", rFrom);
  if (rTo) query = query.lte("received_date", rTo);
  const { data: rows, count } = await query
    .order("received_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  const list = (rows ?? []) as any[];

  return (
    <>
      <CrmDateFilter />
      <CrmFilterBar
        filters={[
          { key: "status", label: "Status", options: INTERVIEW_STATUS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: "round", label: "Round", options: INTERVIEW_ROUND.map((s) => ({ value: s, label: s })) },
          { key: "outcome", label: "Outcome", options: INTERVIEW_OUTCOME.map((s) => ({ value: s, label: labelize(s) })) },
        ]}
        search={{ key: "q", placeholder: "Search job or company" }}
      />
      <Table>
        <THead>
          <TR>
            <TH>Job / Company</TH><TH>BD</TH><TH>Round</TH><TH>Status</TH><TH>Outcome</TH>
            <TH>Received</TH><TH>Interview</TH><TH>Entry</TH><TH>Modified</TH><TH></TH>
          </TR>
        </THead>
        <TBody>
          {list.map((iv) => (
            <TR key={iv.id}>
              <TD className="font-medium">{iv.job_title || "—"}<div className="text-caption text-text-secondary">{iv.company}</div></TD>
              <TD className="text-text-secondary">{iv.owner?.full_name ?? "—"}</TD>
              <TD>{iv.round ?? "—"}</TD>
              <TD><Badge tone={statusTone(iv.status)}>{labelize(iv.status)}</Badge></TD>
              <TD>{iv.outcome ? <Badge tone={statusTone(iv.outcome)}>{labelize(iv.outcome)}</Badge> : "—"}</TD>
              <TD className="text-text-secondary">{formatCrmDate(iv.received_date)}</TD>
              <TD className="text-text-secondary">{formatCrmDatetime(iv.interview_at)}</TD>
              <TD className="text-text-secondary">{formatCrmDate(iv.created_at)}</TD>
              <TD className="text-text-secondary">{formatCrmDate(iv.updated_at)}</TD>
              <TD className="text-right">{iv.lead_id && <Link href={`/crm/leads/${iv.lead_id}`} className="text-caption text-brand-primary hover:underline">Open lead</Link>}</TD>
            </TR>
          ))}
          {list.length === 0 && <TR><TD colSpan={10} className="py-6 text-center text-text-secondary">No interviews match.</TD></TR>}
        </TBody>
      </Table>
      <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
    </>
  );
}
