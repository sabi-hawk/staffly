import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { labelize, statusTone } from "@/lib/crm/constants";
import { formatCrmDatetime as fmt } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function CrmInterviewsPage({ searchParams }: { searchParams: { page?: string; pageSize?: string } }) {
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);
  const { data: rows, count } = await supabase
    .from("interviews")
    .select("id, job_title, company, status, round, outcome, interview_at, lead_id, profile:dev_profiles(name), given:profiles!interviews_given_by_fkey(full_name)", { count: "exact" })
    .order("interview_at", { ascending: false, nullsFirst: false })
    .range(from, to);
  const list = (rows ?? []) as any[];

  return (
    <Card>
      <CardHeader><CardTitle>Interviews ({count ?? 0})</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR><TH>Job / Company</TH><TH>Profile</TH><TH>Round</TH><TH>Status</TH><TH>Outcome</TH><TH>Given by</TH><TH>When</TH><TH></TH></TR>
          </THead>
          <TBody>
            {list.map((iv) => (
              <TR key={iv.id}>
                <TD className="font-medium">{iv.job_title || "—"}<div className="text-caption text-text-secondary">{iv.company}</div></TD>
                <TD>{iv.profile?.name ?? "—"}</TD>
                <TD>{iv.round ?? "—"}</TD>
                <TD><Badge tone={statusTone(iv.status)}>{labelize(iv.status)}</Badge></TD>
                <TD>{iv.outcome ? <Badge tone={statusTone(iv.outcome)}>{labelize(iv.outcome)}</Badge> : "—"}</TD>
                <TD>{iv.given?.full_name ?? "—"}</TD>
                <TD className="text-text-secondary">{fmt(iv.interview_at)}</TD>
                <TD className="text-right">{iv.lead_id && <Link href={`/crm/leads/${iv.lead_id}`} className="text-caption text-brand-primary hover:underline">Open lead</Link>}</TD>
              </TR>
            ))}
            {list.length === 0 && <TR><TD colSpan={8} className="py-6 text-center text-text-secondary">No interviews yet.</TD></TR>}
          </TBody>
        </Table>
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
      </CardContent>
    </Card>
  );
}
