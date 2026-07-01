import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/crm/access";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DealsSettings } from "@/components/crm/deals-settings";
import type { ReceivingAccount, PaymentMethod } from "@/lib/types";

export default async function DealsSettingsPage() {
  const me = await getCurrentProfile();
  if (!me || !isAdminRole(me.role)) redirect("/dashboard");
  const supabase = createClient();
  const [{ data: accounts }, { data: methods }] = await Promise.all([
    supabase.from("receiving_accounts").select("*").order("holder_name"),
    supabase.from("payment_methods").select("*").order("sort_order"),
  ]);

  return (
    <div className="space-y-4">
      <Link href="/crm/deals" className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-brand-primary">
        <ChevronLeft className="size-4" /> Back to deals
      </Link>
      <Card>
        <CardHeader><CardTitle>Receiving accounts &amp; payment methods</CardTitle></CardHeader>
        <CardContent>
          <DealsSettings accounts={(accounts ?? []) as ReceivingAccount[]} methods={(methods ?? []) as PaymentMethod[]} />
        </CardContent>
      </Card>
    </div>
  );
}
