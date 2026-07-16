import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { hasPermP } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { leadOptions, crmProfileOptions, dealMemberOptions, closerOptions, bdOptions, accountOptions, methodOptions } from "@/lib/crm/options";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DealForm } from "@/components/crm/deal-form";

export default async function NewDealPage({ searchParams }: { searchParams: { lead?: string } }) {
  const me = await getCurrentProfile();
  if (!me || !hasPermP(me, PERM.dealsManage)) redirect("/dashboard");
  const supabase = createClient();
  const [leads, profiles, developers, closers, bds, accounts, methods] = await Promise.all([
    leadOptions(supabase), crmProfileOptions(supabase), dealMemberOptions(supabase), closerOptions(supabase), bdOptions(supabase),
    accountOptions(supabase), methodOptions(supabase),
  ]);

  // Prefill from a lead when "Create deal from this lead" was used.
  let initial: Record<string, string | null> | undefined;
  if (searchParams.lead) {
    const { data: lead } = await supabase.from("leads").select("id, dev_profile_id, role").eq("id", searchParams.lead).maybeSingle();
    if (lead) initial = { lead_id: lead.id, dev_profile_id: lead.dev_profile_id, designation: lead.role };
  }

  return (
    <div className="space-y-4">
      <Link href="/crm/deals" className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-brand-primary">
        <ChevronLeft className="size-4" /> Back to deals
      </Link>
      <Card>
        <CardHeader><CardTitle>New deal</CardTitle></CardHeader>
        <CardContent>
          <DealForm leads={leads} profiles={profiles} developers={developers} closers={closers} bds={bds} accounts={accounts} methods={methods} initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
