"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { InfoHint } from "@/components/crm/info-hint";

// Company name is intentionally NOT editable — branding is fixed (owner, 2026-07-06); the stored
// value still feeds the payslip letterhead.
const FIELDS: { key: string; label: string; hint: string }[] = [
  {
    key: "annual_leave_quota",
    label: "Annual leave / year",
    hint: "Paid annual quota. Accrues 1 day per completed month up to this cap; carries within the calendar year only. Probation staff accrue none.",
  },
  {
    key: "casual_leave_quota",
    label: "Casual leave / month",
    hint: "Casual days allowed per month (no carry-over, max 1 request per month). Probation staff get 1 per 3 months.",
  },
  {
    key: "default_checkin_buffer",
    label: "Check-in buffer (min)",
    hint: "Grace period after shift start before a check-in is marked LATE. E.g. 90 = checking in up to 1h30 after shift start still counts on-time.",
  },
  {
    key: "missed_checkout_grace_hours",
    label: "Missed-checkout grace (h)",
    hint: "How many hours past expected checkout before the system treats it as a FORGOTTEN checkout and raises an admin alert so HR can fix the record.",
  },
  {
    key: "overtime_warning_hours",
    label: "Still checked-in alert (h)",
    hint: "Alerts ADMINS when someone is still checked in this many hours past their expected checkout — it catches forgotten checkouts / unusually long sessions. It is an admin heads-up, never a warning shown to the employee.",
  },
];

export function SettingsEditor({ settings }: { settings: Record<string, any> }) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, String(settings?.[f.key] ?? "")]))
  );
  // Default ON when the column is missing/null (matches the DB default).
  const [showSummary, setShowSummary] = useState<boolean>(settings?.show_employee_attendance_summary ?? true);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload: Record<string, any> = { id: 1, show_employee_attendance_summary: showSummary };
    for (const f of FIELDS) payload[f.key] = Number(form[f.key]) || 0;
    const supabase = createClient();
    const { error } = await supabase.from("company_settings").upsert(payload, { onConflict: "id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            {f.label} <InfoHint text={f.hint} label={f.label} />
          </Label>
          <Input type="number" value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
        </div>
      ))}
      <label className="flex items-start gap-2 rounded-md border border-border p-3 sm:col-span-3">
        <input type="checkbox" className="mt-0.5" checked={showSummary} onChange={(e) => setShowSummary(e.target.checked)} />
        <span>
          <span className="text-sm font-medium text-text-primary">Show attendance summary to employees</span>
          <span className="block text-caption text-text-secondary">When on, employees see their own worked-days / leaves / missing / extra-deficit summary and the deficit/extra column on the Attendance tab. Admins always see it.</span>
        </span>
      </label>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
      </div>
    </form>
  );
}
