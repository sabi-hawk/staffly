import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CrmTabs } from "@/components/crm/crm-tabs";
import { LeadsTable } from "@/components/crm/leads-table";
import { InterviewsGrid } from "@/components/crm/interviews-grid";
import { AssessmentsGrid } from "@/components/crm/assessments-grid";

// The CRM Leads hub (FRD-07): one page, three tabs — Leads / Interviews / Assessments.
export default async function CrmLeadsHubPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const tab = ["leads", "interviews", "assessments"].includes(searchParams.tab ?? "")
    ? (searchParams.tab as string)
    : "leads";

  const title = tab === "interviews" ? "Interviews" : tab === "assessments" ? "Assessments" : "Leads";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>CRM · {title}</CardTitle>
        <Button asChild size="sm">
          <Link href="/crm/leads/new"><Plus className="size-4" /> New lead</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <CrmTabs active={tab} />
        {tab === "leads" && <LeadsTable searchParams={searchParams} />}
        {tab === "interviews" && <InterviewsGrid searchParams={searchParams} />}
        {tab === "assessments" && <AssessmentsGrid searchParams={searchParams} />}
      </CardContent>
    </Card>
  );
}
