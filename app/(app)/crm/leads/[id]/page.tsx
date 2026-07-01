import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isBdLead, isAdminRole } from "@/lib/crm/access";
import { createClient } from "@/lib/supabase/server";
import { crmProfileOptions, developerOptions, bdOptions } from "@/lib/crm/options";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { labelize, statusTone } from "@/lib/crm/constants";
import { LeadForm } from "@/components/crm/lead-form";
import { DisqualifyPanel } from "@/components/crm/disqualify-panel";
import { LeadActivity } from "@/components/crm/lead-activity";
import type { Interview, Assessment } from "@/lib/types";
import type { AssessmentDoc } from "@/components/crm/assessment-docs";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function LeadDetail({ params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) notFound();
  const supabase = createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*, profile:dev_profiles(name), owner:profiles!leads_owner_bd_id_fkey(full_name)")
    .eq("id", params.id)
    .single();
  if (!lead) notFound();

  const [ivRes, asRes, profiles, developers, owners] = await Promise.all([
    supabase.from("interviews").select("*").eq("lead_id", params.id).order("interview_at", { ascending: true, nullsFirst: false }),
    supabase.from("assessments").select("*").eq("lead_id", params.id).order("created_at", { ascending: true }),
    crmProfileOptions(supabase),
    developerOptions(supabase),
    bdOptions(supabase),
  ]);
  const interviews = (ivRes.data ?? []) as Interview[];
  const assessments = (asRes.data ?? []) as Assessment[];

  const docsByAssessment: Record<string, AssessmentDoc[]> = {};
  const asIds = assessments.map((a) => a.id);
  if (asIds.length) {
    const { data: docs } = await supabase
      .from("assessment_documents")
      .select("id, assessment_id, doc_type, label, file_name")
      .in("assessment_id", asIds);
    for (const d of (docs ?? []) as any[]) (docsByAssessment[d.assessment_id] ??= []).push(d);
  }

  const profileName = (lead.profile as any)?.name ?? "—";
  const ownerName = (lead.owner as any)?.full_name ?? "—";

  return (
    <div className="space-y-4">
      <Link href="/crm/leads" className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-brand-primary">
        <ChevronLeft className="size-4" /> Back to leads
      </Link>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{lead.company}{lead.role ? ` · ${lead.role}` : ""}</CardTitle>
          <div className="flex items-center gap-2">
            {isAdminRole(me.role) && (
              <Button asChild size="sm" variant="outline"><Link href={`/crm/deals/new?lead=${lead.id}`}>Create deal</Link></Button>
            )}
            <Badge tone={statusTone(lead.status)}>{labelize(lead.status)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3 text-sm">
            <div><dt className="text-caption text-text-secondary">Profile</dt><dd>{profileName}</dd></div>
            <div><dt className="text-caption text-text-secondary">Owner (BD)</dt><dd>{ownerName}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Qualification</CardTitle></CardHeader>
        <CardContent>
          <DisqualifyPanel
            leadId={lead.id}
            disqualified={lead.status === "disqualified"}
            category={lead.disqualified_category}
            note={lead.disqualified_note}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardContent>
          <LeadActivity
            leadId={lead.id}
            devProfileId={lead.dev_profile_id}
            company={lead.company}
            developers={developers}
            interviews={interviews}
            assessments={assessments}
            docsByAssessment={docsByAssessment}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Edit lead</CardTitle></CardHeader>
        <CardContent>
          <LeadForm
            id={lead.id}
            profiles={profiles}
            owners={owners}
            canAssignOwner={isBdLead(me)}
            initial={{ company: lead.company, role: lead.role, dev_profile_id: lead.dev_profile_id, status: lead.status, owner_bd_id: lead.owner_bd_id }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
