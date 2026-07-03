import { createClient } from "@/lib/supabase/server";
import { leadCompanyOptions, crmProfileOptions } from "@/lib/crm/options";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CrmTabs } from "@/components/crm/crm-tabs";
import { AddActivity } from "@/components/crm/add-activity";
import { LeadsCards } from "@/components/crm/leads-cards";
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

  const supabase = createClient();
  const [leads, profiles] = await Promise.all([leadCompanyOptions(supabase), crmProfileOptions(supabase)]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>CRM · {title}</CardTitle>
        <AddActivity leads={leads} profiles={profiles} />
      </CardHeader>
      <CardContent>
        <CrmTabs active={tab} />
        {tab === "leads" && <LeadsCards searchParams={searchParams} profiles={profiles} />}
        {tab === "interviews" && <InterviewsGrid searchParams={searchParams} />}
        {tab === "assessments" && <AssessmentsGrid searchParams={searchParams} />}
      </CardContent>
    </Card>
  );
}
