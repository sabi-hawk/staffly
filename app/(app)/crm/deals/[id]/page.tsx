import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { hasPermP } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { leadOptions, crmProfileOptions, developerOptions, peopleOptions, bdOptions, accountOptions, methodOptions } from "@/lib/crm/options";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { labelize, statusTone } from "@/lib/crm/constants";
import { formatMoney, formatCode } from "@/lib/utils";
import { DealForm } from "@/components/crm/deal-form";
import { ColoredName, ColorChip } from "@/components/crm/crm-cells";
import { DealDocuments, type DealDoc } from "@/components/crm/deal-documents";
import { DealPayments, type DealPayment } from "@/components/crm/deal-payments";
import { RichNoteSection } from "@/components/crm/rich-note-section";
import { RecordHistory } from "@/components/audit/record-history";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function DealDetail({ params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me || !hasPermP(me, PERM.dealsView)) redirect("/dashboard");
  const supabase = createClient();

  const { data: deal } = await supabase
    .from("deals")
    .select("*, lead:leads(company), profile:dev_profiles(name, color), closer:profiles!deals_closer_id_fkey(full_name, color), owner_bd:profiles!deals_owner_bd_id_fkey(full_name, color), account:receiving_accounts(holder_name), method:payment_methods(name)")
    .eq("id", params.id)
    .single();
  if (!deal) notFound();

  const { data: docRows } = await supabase.from("deal_documents").select("id, label, file_name").eq("deal_id", params.id).order("created_at");
  const docs = (docRows ?? []) as DealDoc[];

  // Deal finance (super-admin only, per deal_payments RLS): the ledger of receipts by billing month.
  const isSuper = me.role === "super_admin";
  const payments = isSuper
    ? ((await supabase.from("deal_payments").select("id, amount, received_on, billing_month, note, created_at").eq("deal_id", params.id).order("billing_month", { ascending: false }).order("received_on", { ascending: false })).data ?? [])
    : [];

  const { data: devRows } = await supabase
    .from("deal_developers").select("developer_id, role, dev:profiles!deal_developers_developer_id_fkey(full_name, color)")
    .eq("deal_id", params.id);
  // working developers (multi) come from the `developer` rows of deal_developers
  const workingDevs = (devRows ?? []).filter((r: any) => r.role === "developer");
  const workingDevIds = workingDevs.map((r: any) => r.developer_id);

  const [leads, profiles, developers, people, bds, accounts, methods] = await Promise.all([
    leadOptions(supabase), crmProfileOptions(supabase), developerOptions(supabase), peopleOptions(supabase), bdOptions(supabase),
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
          <CardTitle className="flex items-center gap-2">
            {d.name || d.lead?.company || "Deal"}{d.designation ? ` · ${d.designation}` : ""}
            <Badge tone="neutral">{formatCode(d.deal_code)}</Badge>
          </CardTitle>
          <Badge tone={statusTone(d.status)}>{labelize(d.status)}</Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3 text-sm">
            <div><dt className="text-caption text-text-secondary">Closer</dt><dd><ColorChip label={d.closer?.full_name} color={d.closer?.color} /></dd></div>
            <div><dt className="text-caption text-text-secondary">BD owner</dt><dd><ColorChip label={d.owner_bd?.full_name} color={d.owner_bd?.color} /></dd></div>
            <div><dt className="text-caption text-text-secondary">Profile</dt><dd><ColoredName name={d.profile?.name} color={d.profile?.color} className="font-medium" /></dd></div>
            <div><dt className="text-caption text-text-secondary">Working developers</dt><dd className="flex flex-wrap gap-1">{workingDevs.length === 0 ? <span className="text-text-secondary">—</span> : workingDevs.map((w: any) => <ColorChip key={w.developer_id} label={w.dev?.full_name} color={w.dev?.color} />)}</dd></div>
            <div><dt className="text-caption text-text-secondary">Salary</dt><dd>{formatMoney(d.salary, d.currency)}</dd></div>
            <div><dt className="text-caption text-text-secondary">Joining date</dt><dd>{d.joining_date ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Receiving account</dt><dd>{d.account?.holder_name ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Payment method</dt><dd>{d.method?.name ?? "—"}</dd></div>
            <div><dt className="text-caption text-text-secondary">Profile DOB</dt><dd>{d.profile_dob ?? "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {isSuper && (
        <Card>
          <CardHeader>
            <CardTitle>Payments received</CardTitle>
            <p className="text-caption text-text-secondary">Log each payment from this client against the month it counts toward. Totals per month feed the assigned BD&apos;s commission.</p>
          </CardHeader>
          <CardContent><DealPayments dealId={d.id} payments={payments as DealPayment[]} /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent><DealDocuments dealId={d.id} docs={docs} /></CardContent>
      </Card>

      <RichNoteSection
        endpoint={`/api/crm/deals/${d.id}`}
        field="notes"
        title="Notes"
        description="Anything worth tracking about this deal: agreements, next steps, contacts, reminders."
        valueHtml={d.notes}
        placeholder="Type deal notes… you can format text and paste links."
      />

      <Card>
        <CardHeader><CardTitle>Edit deal</CardTitle></CardHeader>
        <CardContent>
          <DealForm
            id={d.id}
            leads={leads}
            profiles={profiles}
            developers={developers}
            people={people}
            bds={bds}
            accounts={accounts}
            methods={methods}
            initialDevelopers={workingDevIds}
            initial={{
              name: d.name, lead_id: d.lead_id, dev_profile_id: d.dev_profile_id, working_developer: d.working_developer,
              closer_id: d.closer_id, owner_bd_id: d.owner_bd_id, currency: d.currency,
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
