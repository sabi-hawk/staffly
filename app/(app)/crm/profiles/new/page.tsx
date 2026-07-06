import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isAdminRole } from "@/lib/crm/access";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProfileForm } from "@/components/crm/profile-form";

export default async function NewCrmProfilePage() {
  const me = await getCurrentProfile();
  if (!hasPermP(me, PERM.crmProfilesPassword)) redirect("/crm/profiles");

  const supabase = createClient();
  const [{ data: stacks }, { data: bds }] = await Promise.all([
    supabase.from("dev_stacks").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("profiles").select("id, full_name").eq("department", "Business Development").order("full_name"),
  ]);

  return (
    <div className="space-y-4">
      <Link href="/crm/profiles" className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-brand-primary">
        <ChevronLeft className="size-4" /> Back to profiles
      </Link>
      <Card>
        <CardHeader><CardTitle>New profile</CardTitle></CardHeader>
        <CardContent>
          <ProfileForm
            stacks={(stacks ?? []).map((s) => ({ id: s.id, label: s.name }))}
            owners={(bds ?? []).map((b) => ({ id: b.id, label: b.full_name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
