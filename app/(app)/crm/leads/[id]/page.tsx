import { notFound } from "next/navigation";
import { BackLink } from "@/components/crm/back-link";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isBdLead, isAdminRole, isSuperAdminRole } from "@/lib/crm/access";
import { createClient } from "@/lib/supabase/server";
import { crmProfileOptions, developerOptions, bdOptions } from "@/lib/crm/options";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LeadDetailsCard } from "@/components/crm/lead-details-card";
import { LeadRichSection } from "@/components/crm/lead-rich-section";
import { QualificationPanel } from "@/components/crm/disqualify-panel";
import { LeadActivity } from "@/components/crm/lead-activity";
import { LeadDocuments } from "@/components/crm/lead-documents";
import { LeadContacts, type Contact } from "@/components/crm/lead-contacts";
import { RecordHistory } from "@/components/audit/record-history";
import { LEAD_HINTS } from "@/lib/crm/field-hints";
import type { Interview, Assessment } from "@/lib/types";

// Always render fresh so mutations (resume upload, status change, edit, qualify) reflect on refresh.
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function LeadDetail({ params, searchParams }: { params: { id: string }; searchParams: { edit?: string } }) {
  const me = await getCurrentProfile();
  if (!me) notFound();
  const supabase = createClient();

  // Deep-link from the grid "edit" action: ?edit=interviews:<id> | assessments:<id> → auto-open that
  // record's edit form in the Activity section (and scroll to it).
  const [editKind, editId] = (searchParams.edit ?? "").split(":");
  const initialEdit =
    (editKind === "interviews" || editKind === "assessments") && editId ? { kind: editKind, id: editId } : null;

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

  const { data: contacts } = await supabase
    .from("lead_contacts")
    .select("id, contact_type, other_type, name, email, phone, linkedin_url, note")
    .eq("lead_id", params.id)
    .order("created_at", { ascending: true });

  const profileName = (lead.profile as any)?.name ?? "—";
  const ownerName = (lead.owner as any)?.full_name ?? "—";
  const canEditLead = isBdLead(me) || lead.owner_bd_id === me.id;

  return (
    <div className="space-y-4">
      <BackLink fallback="/crm/leads" label="Back" />

      {/* Top card: key info in view mode; Edit toggles the SAME section into an inline form (no modal). */}
      <LeadDetailsCard
        leadId={lead.id}
        profileName={profileName}
        ownerName={ownerName}
        profiles={profiles}
        owners={owners}
        canAssignOwner={isBdLead(me)}
        canCreateDeal={hasPermP(me, PERM.dealsManage)}
        initial={{
          company: lead.company, role: lead.role, dev_profile_id: lead.dev_profile_id,
          status: lead.status, owner_bd_id: lead.owner_bd_id, budget: lead.budget,
          expected_budget: lead.expected_budget, shift: lead.shift,
        }}
      />

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
            initialEdit={initialEdit as { kind: "interviews" | "assessments"; id: string } | null}
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

      {/* Job description + BD notes as their own editable sections below Documents (owner feedback). */}
      <LeadRichSection
        leadId={lead.id}
        field="job_description"
        title="Job description"
        description="The full job description from the client. Paste or type it here so anyone on the team can read the role's requirements."
        hint={LEAD_HINTS.job_description}
        valueHtml={lead.job_description}
        placeholder="Paste or type the job description…"
      />
      <LeadRichSection
        leadId={lead.id}
        field="notes"
        title="BD notes"
        description="Your private notepad for this lead: call notes, next steps, reminders, anything useful for the deal."
        hint={LEAD_HINTS.notes}
        valueHtml={lead.notes}
        placeholder="e.g. Spoke to HR on Mon, awaiting test link…"
      />

      {/* Company-side contacts (owner feedback): the client's reps, for future outreach. */}
      <LeadContacts leadId={lead.id} contacts={(contacts ?? []) as Contact[]} canEdit={canEditLead} />

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
