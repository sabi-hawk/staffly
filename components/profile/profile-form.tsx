"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Profile } from "@/lib/types";

const FIELDS: { key: keyof Profile; label: string }[] = [
  { key: "full_name", label: "Full name" },
  { key: "phone", label: "Phone" },
  { key: "emergency_name", label: "Emergency contact name" },
  { key: "emergency_phone", label: "Emergency contact phone" },
  { key: "emergency_relation", label: "Emergency relation" },
];

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, (profile[f.key] as string) ?? ""]))
  );
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update(form).eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label>{f.label}</Label>
          <Input
            value={form[f.key]}
            onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
          />
        </div>
      ))}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}
