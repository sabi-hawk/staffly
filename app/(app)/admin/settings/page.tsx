import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { HolidaysEditor } from "@/components/admin/holidays-editor";

export default async function SettingsPage() {
  const profile = (await getCurrentProfile())!;
  if (!hasPermP(profile, PERM.settingsManage)) redirect("/admin/dashboard");

  const supabase = createClient();
  const { data: settings } = await supabase.from("company_settings").select("*").eq("id", 1).maybeSingle();
  const { data: holidays } = await supabase.from("holidays").select("*").order("holiday_date");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company settings</CardTitle>
          <CardDescription>Leave quotas and alert thresholds. Quotas drive the leave rules.</CardDescription>
        </CardHeader>
        <CardContent><SettingsEditor settings={settings ?? {}} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holidays</CardTitle>
          <CardDescription>Excluded from working-day math for attendance, leave and payroll.</CardDescription>
        </CardHeader>
        <CardContent><HolidaysEditor holidays={holidays ?? []} /></CardContent>
      </Card>
    </div>
  );
}
