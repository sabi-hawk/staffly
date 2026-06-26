import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export default async function SettingsPage() {
  const profile = (await getCurrentProfile())!;
  if (!isSuperAdmin(profile.role)) redirect("/admin/dashboard");

  const supabase = createClient();
  const { data: settings } = await supabase.from("company_settings").select("*").eq("id", 1).maybeSingle();
  const { data: holidays } = await supabase.from("holidays").select("*").order("holiday_date");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Company settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <Field label="Company" value={settings?.company_name} />
          <Field label="Annual quota" value={settings?.annual_leave_quota} />
          <Field label="Casual quota" value={settings?.casual_leave_quota} />
          <Field label="Check-in buffer" value={`${settings?.default_checkin_buffer} min`} />
          <Field label="Missed-checkout grace" value={`${settings?.missed_checkout_grace_hours} h`} />
          <Field label="Overtime warning" value={`${settings?.overtime_warning_hours} h`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Holidays</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Name</TH><TH>Date</TH><TH>Year</TH></TR></THead>
            <TBody>
              {(holidays ?? []).map((h) => (
                <TR key={h.id}><TD>{h.name}</TD><TD className="tabular">{h.holiday_date}</TD><TD className="tabular">{h.year}</TD></TR>
              ))}
              {(holidays ?? []).length === 0 && <TR><TD className="py-6 text-center text-text-secondary">No holidays defined.</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-text-secondary">{label}</span>
      <div className="text-text-primary">{value ?? "—"}</div>
    </div>
  );
}
