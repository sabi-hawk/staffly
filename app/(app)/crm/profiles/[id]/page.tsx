import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isBdLead } from "@/lib/crm/access";
import { bdOptions } from "@/lib/crm/options";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ProfileBanner } from "@/components/crm/profile-banner";
import { PasswordPanel } from "@/components/crm/password-panel";
import { DocumentsPanel, type Doc } from "@/components/crm/documents-panel";
import { RecordHistory } from "@/components/audit/record-history";

export const dynamic = "force-dynamic";

export default async function CrmProfileDetail({ params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  const isAdmin = hasPermP(me, PERM.crmProfilesManage);
  const supabase = createClient();

  // RLS returns null if this viewer may not see the profile (e.g. a BD who doesn't own it).
  const { data: p } = await supabase
    .from("dev_profiles")
    .select("*, stack:dev_stacks(name), owner:profiles(full_name)")
    .eq("id", params.id)
    .single();
  if (!p) notFound();

  // The owning BD (or a BD-Lead / admin) may add, mark-primary, note, and soft-delete documents.
  const canEdit = isBdLead(me ?? { role: null }) || p.owner_bd_id === me?.id;

  // Active documents everyone-with-access sees; soft-deleted history is admin-only.
  const { data: docRows } = await supabase
    .from("dev_profile_documents")
    .select("id, doc_type, label, note, is_primary, file_name, created_at")
    .eq("dev_profile_id", params.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  const docs = (docRows ?? []) as Doc[];

  let deletedDocs: Doc[] = [];
  if (isAdmin) {
    const { data: del } = await supabase
      .from("dev_profile_documents")
      .select("id, doc_type, label, note, is_primary, file_name, created_at, deleted_at, deleter:profiles!dev_profile_documents_deleted_by_fkey(full_name)")
      .eq("dev_profile_id", params.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    deletedDocs = (del ?? []).map((d: any) => ({ ...d, deleted_by_name: d.deleter?.full_name ?? null })) as Doc[];
  }

  let stacks: { id: string; label: string }[] = [];
  let owners: { id: string; label: string }[] = [];
  if (isAdmin) {
    const [st, bd] = await Promise.all([
      supabase.from("dev_stacks").select("id, name").eq("is_active", true).order("sort_order"),
      bdOptions(supabase),
    ]);
    stacks = (st.data ?? []).map((s) => ({ id: s.id, label: s.name }));
    owners = bd;
  }
  // Whether a password EXISTS (the value itself loads lazily on Reveal). RLS returns the row to
  // admins/super and — since 0045 — the owning BD, so a BD sees "set/not set" and can reveal/copy.
  const { data: sec } = await supabase
    .from("dev_profile_secrets").select("account_password").eq("dev_profile_id", params.id).maybeSingle();
  const hasPassword = !!sec?.account_password;

  const stackName = (p.stack as { name: string } | null)?.name ?? "—";
  const ownerName = (p.owner as { full_name: string } | null)?.full_name ?? "Unassigned";

  return (
    <div className="space-y-4">
      <Link href="/crm/profiles" className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-brand-primary">
        <ChevronLeft className="size-4" /> Back to profiles
      </Link>

      <ProfileBanner
        profile={{
          id: p.id,
          profile_no: p.profile_no,
          name: p.name,
          status: p.status,
          email: p.email,
          mobile: p.mobile,
          dob: p.dob,
          notes: p.notes,
          owner_bd_id: p.owner_bd_id,
          stack_name: (p.stack as { name: string } | null)?.name ?? null,
        }}
        stackName={stackName}
        ownerName={ownerName}
        canEdit={isAdmin}
        stacks={stacks}
        owners={owners}
      />

      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent>
          <DocumentsPanel profileId={p.id} docs={docs} deletedDocs={deletedDocs} canEdit={canEdit} isAdmin={isAdmin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account password</CardTitle>
          <CardDescription>{isAdmin ? "The login for this persona's job-application accounts." : "Reveal or copy the login for this persona; only an admin can change it."}</CardDescription>
        </CardHeader>
        <CardContent><PasswordPanel profileId={p.id} hasPassword={hasPassword} canEdit={isAdmin} /></CardContent>
      </Card>{" "}

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent><RecordHistory entity="dev_profiles" id={p.id} /></CardContent>
      </Card>
    </div>
  );
}
