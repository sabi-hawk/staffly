import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isAdminRole, isBdLead } from "@/lib/crm/access";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/crm/profile-form";
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
  let hasPassword = false;
  if (isAdmin) {
    const [st, bd, sec] = await Promise.all([
      supabase.from("dev_stacks").select("id, name").eq("is_active", true).order("sort_order"),
      supabase.from("profiles").select("id, full_name").eq("department", "Business Development").order("full_name"),
      // only whether a password EXISTS — the value is fetched lazily by PasswordPanel on Reveal
      supabase.from("dev_profile_secrets").select("dev_profile_id, account_password").eq("dev_profile_id", params.id).maybeSingle(),
    ]);
    stacks = (st.data ?? []).map((s) => ({ id: s.id, label: s.name }));
    owners = (bd.data ?? []).map((b) => ({ id: b.id, label: b.full_name }));
    hasPassword = !!sec.data?.account_password;
  }

  const stackName = (p.stack as { name: string } | null)?.name ?? "—";
  const ownerName = (p.owner as { full_name: string } | null)?.full_name ?? "Unassigned";

  return (
    <div className="space-y-4">
      <Link href="/crm/profiles" className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-brand-primary">
        <ChevronLeft className="size-4" /> Back to profiles
      </Link>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{p.name} · {stackName}</CardTitle>
          <Badge tone={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div><dt className="text-caption text-text-secondary">Owner (BD)</dt><dd>{ownerName}</dd></div>
            <div><dt className="text-caption text-text-secondary">Email</dt><dd>{p.email ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Mobile</dt><dd>{p.mobile ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Date of birth</dt><dd>{p.dob ?? "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-caption text-text-secondary">Notes</dt><dd>{p.notes ?? "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent>
          <DocumentsPanel profileId={p.id} docs={docs} deletedDocs={deletedDocs} canEdit={canEdit} isAdmin={isAdmin} />
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card>
            <CardHeader><CardTitle>Account password</CardTitle></CardHeader>
            <CardContent><PasswordPanel profileId={p.id} hasPassword={hasPassword} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Edit profile</CardTitle></CardHeader>
            <CardContent>
              <ProfileForm
                id={p.id}
                stacks={stacks}
                owners={owners}
                initial={{
                  name: p.name,
                  stack: (p.stack as { name: string } | null)?.name ?? "",
                  owner_bd_id: p.owner_bd_id,
                  email: p.email,
                  mobile: p.mobile,
                  dob: p.dob,
                  status: p.status,
                  notes: p.notes,
                }}
              />
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent><RecordHistory entity="dev_profiles" id={p.id} /></CardContent>
      </Card>
    </div>
  );
}
