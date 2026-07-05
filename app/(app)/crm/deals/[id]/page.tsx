import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/crm/access";
import { createClient } from "@/lib/supabase/server";
import { leadOptions, crmProfileOptions, developerOptions, accountOptions, methodOptions } from "@/lib/crm/options";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { labelize, statusTone } from "@/lib/crm/constants";
import { formatPKR } from "@/lib/utils";
import { DealForm } from "@/components/crm/deal-form";
import { DealDevelopers } from "@/components/crm/deal-developers";
import { DealDocuments, type DealDoc } from "@/components/crm/deal-documents";
import { RecordHistory } from "@/components/audit/record-history";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function DealDetail({ params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me || !isAdminRole(me.role)) redirect("/dashboard");
  const supabase = createClient();

  const { data: deal } = await supabase
    .from("deals")
    .select("*, lead:leads(company), profile:dev_profiles(name), dev:profiles!deals_working_developer_fkey(full_name), account:receiving_accounts(holder_name), method:payment_methods(name)")
    .eq("id", params.id)
    .single();
  if (!deal) notFound();

  const { data: docRows } = await supabase.from("deal_documents").select("id, label, file_name").eq("deal_id", params.id).order("created_at");
  const docs = (docRows ?? []) as DealDoc[];

  const { data: devRows } = await supabase
    .from("deal_developers").select("developer_id, role, dev:profiles!deal_developers_developer_id_fkey(full_name)")
    .eq("deal_id", params.id);
  const assignments = (devRows ?? []).map((r: any) => ({ developer_id: r.developer_id, role: r.role }));

  const [leads, profiles, developers, accounts, methods] = await Promise.all([
    leadOptions(supabase), crmProfileOptions(supabase), developerOptions(supabase),
    accountOptions(supabase), methodOptions(supabase),
  ]);

  const d = deal as any;
  return (
    <div className="space-y-4">
      <Link href="/crm/deals" className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-brand-primary">
        <ChevronLeft className="size-4" /> Back to deals
      </Link>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{d.name || d.lead?.company || "Deal"}{d.designation ? ` · ${d.designation}` : ""}</CardTitle>
          <Badge tone={statusTone(d.status)}>{labelize(d.status)}</Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3 text-sm">
            <div><dt className="text-caption text-text-secondary">Profile</dt><dd>{d.profile?.name ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Working developer</dt><dd>{d.dev?.full_name ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Salary</dt><dd>{d.salary != null ? formatPKR(d.salary) : "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Joining date</dt><dd>{d.joining_date ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Receiving account</dt><dd>{d.account?.holder_name ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Payment method</dt><dd>{d.method?.name ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Profile DOB</dt><dd>{d.profile_dob ?? "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assigned developers</CardTitle></CardHeader>
        <CardContent><DealDevelopers dealId={d.id} developers={developers} initial={assignments} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent><DealDocuments dealId={d.id} docs={docs} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Edit deal</CardTitle></CardHeader>
        <CardContent>
          <DealForm
            id={d.id}
            leads={leads}
            profiles={profiles}
            developers={developers}
            accounts={accounts}
            methods={methods}
            initial={{
              name: d.name, lead_id: d.lead_id, dev_profile_id: d.dev_profile_id, working_developer: d.working_developer,
              designation: d.designation, joining_date: d.joining_date, salary: d.salary != null ? String(d.salary) : "",
              receiving_account_id: d.receiving_account_id, payment_method_id: d.payment_method_id,
              profile_dob: d.profile_dob, status: d.status,
            }}
          />
        </CardContent>
      </Card>

      {me.role === "super_admin" && (
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent><RecordHistory entity="deals" id={d.id} /></CardContent>
        </Card>
      )}
    </div>
  );
}
