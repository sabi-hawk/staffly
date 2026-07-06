import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { SettingsEditor } from "@/components/admin/settings-editor";

export default async function SettingsPage() {
  const profile = (await getCurrentProfile())!;
  if (!hasPermP(profile, PERM.settingsManage)) redirect("/admin/dashboard");

  const supabase = createClient();
  const { data: settings } = await supabase.from("company_settings").select("*").eq("id", 1).maybeSingle();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent><SettingsEditor settings={settings ?? {}} /></CardContent>
      </Card>

      <p className="text-caption text-text-secondary">
        Holidays are managed on the <Link href="/announcements" className="font-medium text-brand-primary hover:underline">Announcements</Link> page.
      </p>
    </div>
  );
}
