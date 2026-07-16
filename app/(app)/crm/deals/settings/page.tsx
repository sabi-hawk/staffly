import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { hasPermP } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DealsSettings } from "@/components/crm/deals-settings";
import type { ReceivingAccount } from "@/lib/types";

export default async function DealsSettingsPage() {
  const me = await getCurrentProfile();
  if (!me || !hasPermP(me, PERM.dealsManage)) redirect("/dashboard");
  const supabase = createClient();
  const { data: accounts } = await supabase.from("receiving_accounts").select("*").order("type").order("holder_name");

  return (
    <div className="space-y-4">
      <Link href="/crm/deals" className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-brand-primary">
        <ChevronLeft className="size-4" /> Back to deals
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Receiving accounts</CardTitle>
          <p className="text-caption text-text-secondary">Every account money can land in — bank, Payoneer, Wise, Western Union. Each deal picks one to record where its payment arrives.</p>
        </CardHeader>
        <CardContent>
          <DealsSettings accounts={(accounts ?? []) as ReceivingAccount[]} />
        </CardContent>
      </Card>
    </div>
  );
}
