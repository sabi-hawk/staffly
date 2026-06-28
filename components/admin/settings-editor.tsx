"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const NUM = ["annual_leave_quota", "casual_leave_quota", "default_checkin_buffer", "missed_checkout_grace_hours", "overtime_warning_hours"];
const FIELDS: { key: string; label: string; type?: string }[] = [
  { key: "company_name", label: "Company name" },
  { key: "annual_leave_quota", label: "Annual leave / year", type: "number" },
  { key: "casual_leave_quota", label: "Casual leave / month", type: "number" },
  { key: "default_checkin_buffer", label: "Check-in buffer (min)", type: "number" },
  { key: "missed_checkout_grace_hours", label: "Missed-checkout grace (h)", type: "number" },
  { key: "overtime_warning_hours", label: "Overtime warning (h)", type: "number" },
];

export function SettingsEditor({ settings }: { settings: Record<string, any> }) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, String(settings?.[f.key] ?? "")]))
  );
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload: Record<string, any> = { id: 1 };
    for (const f of FIELDS) payload[f.key] = NUM.includes(f.key) ? Number(form[f.key]) || 0 : form[f.key];
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
          <Label>{f.label}</Label>
          <Input type={f.type ?? "text"} value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
        </div>
      ))}
      <div className="sm:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
      </div>
    </form>
  );
}
