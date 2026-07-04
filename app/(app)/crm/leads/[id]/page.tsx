import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/crm/back-link";
import { getCurrentProfile } from "@/lib/auth";
import { isBdLead, isAdminRole } from "@/lib/crm/access";
import { createClient } from "@/lib/supabase/server";
import { crmProfileOptions, developerOptions, bdOptions } from "@/lib/crm/options";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { labelize, statusTone } from "@/lib/crm/constants";
import { LeadEditModal } from "@/components/crm/lead-edit-modal";
import { QualificationPanel } from "@/components/crm/disqualify-panel";
import { LeadActivity } from "@/components/crm/lead-activity";
import { LeadDocuments } from "@/components/crm/lead-documents";
import { RecordHistory } from "@/components/audit/record-history";
import type { Interview, Assessment } from "@/lib/types";

// Always render fresh so mutations (resume upload, status change, edit, qualify) reflect on refresh.
export const dynamic = "force-dynamic";

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

  const { data: leadDocs } = await supabase
    .from("lead_documents")
    .select("id, label, file_name, doc_type")
    .eq("lead_id", params.id)
    .order("created_at", { ascending: false });

  const profileName = (lead.profile as any)?.name ?? "—";
  const ownerName = (lead.owner as any)?.full_name ?? "—";

  return (
    <div className="space-y-4">
      <BackLink fallback="/crm/leads" label="Back" />

      {/* Top card: the lead's key info + status + an edit modal (no more repetitive inline form). */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <CardTitle>{lead.company}{lead.role ? ` · ${lead.role}` : ""}</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={statusTone(lead.status)}>{labelize(lead.status)}</Badge>
            {isAdminRole(me.role) && (
              <Button asChild size="sm" variant="outline"><Link href={`/crm/deals/new?lead=${lead.id}`}>Create deal</Link></Button>
            )}
            <LeadEditModal
              id={lead.id}
              profiles={profiles}
              owners={owners}
              canAssignOwner={isBdLead(me)}
              initial={{
                company: lead.company, role: lead.role, dev_profile_id: lead.dev_profile_id,
                status: lead.status, owner_bd_id: lead.owner_bd_id, budget: lead.budget,
                expected_budget: lead.expected_budget, job_description: lead.job_description, notes: lead.notes,
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div><dt className="text-caption text-text-secondary">Profile</dt><dd>{profileName}</dd></div>
            <div><dt className="text-caption text-text-secondary">Owner (BD)</dt><dd>{ownerName}</dd></div>
            <div><dt className="text-caption text-text-secondary">Budget</dt><dd>{lead.budget || "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Expected</dt><dd>{lead.expected_budget || "—"}</dd></div>
          </dl>
          {lead.job_description && (
            <div>
              <dt className="mb-1 text-caption text-text-secondary">Job description</dt>
              <p className="whitespace-pre-wrap text-sm text-text-primary">{lead.job_description}</p>
            </div>
          )}
          {lead.notes && (
            <div>
              <dt className="mb-1 text-caption text-text-secondary">BD notes</dt>
              <p className="whitespace-pre-wrap text-sm text-text-primary">{lead.notes}</p>
            </div>
          )}
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
          />
        </CardContent>
      </Card>

      {/* Deal-specific resumes / files attached to this lead (moved off assessments — owner feedback). */}
      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent>
          <LeadDocuments leadId={lead.id} docs={(leadDocs ?? []) as any[]} />
        </CardContent>
      </Card>

      {/* Qualification lives BELOW activity (owner feedback): default Qualified, mark unqualified w/ reason. */}
      <Card>
        <CardHeader><CardTitle>Qualification</CardTitle></CardHeader>
        <CardContent>
          <QualificationPanel
            leadId={lead.id}
            unqualified={lead.status === "dismissed"}
            category={lead.disqualified_category}
            note={lead.disqualified_note}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent><RecordHistory entity="leads" id={lead.id} /></CardContent>
      </Card>
    </div>
  );
}
