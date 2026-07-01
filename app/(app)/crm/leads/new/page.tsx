import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm, isBdLead } from "@/lib/crm/access";
import { createClient } from "@/lib/supabase/server";
import { crmProfileOptions, bdOptions } from "@/lib/crm/options";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LeadForm } from "@/components/crm/lead-form";

export default async function NewLeadPage() {
  const me = await getCurrentProfile();
  if (!me || !canSeeCrm(me)) redirect("/dashboard");
  const supabase = createClient();
  const [profiles, owners] = await Promise.all([crmProfileOptions(supabase), bdOptions(supabase)]);

  return (
    <div className="space-y-4">
      <Link href="/crm/leads" className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-brand-primary">
        <ChevronLeft className="size-4" /> Back to leads
      </Link>
      <Card>
        <CardHeader><CardTitle>New lead</CardTitle></CardHeader>
        <CardContent>
          <LeadForm profiles={profiles} owners={owners} canAssignOwner={isBdLead(me)} />
        </CardContent>
      </Card>
    </div>
  );
}
