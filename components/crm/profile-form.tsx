"use client";
// Dev-profile create/edit form — the reference implementation of the platform's
// floating-label field convention (components/ui/field.tsx).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatSelect } from "@/components/ui/field";
import { StackField } from "@/components/crm/stack-field";
import { DatePicker } from "@/components/ui/date-picker";
import type { Opt } from "@/lib/crm/options";

export type { Opt }; // re-export for existing importers

export function ProfileForm({
  id,
  stacks,
  owners,
  initial,
  onSaved,
}: {
  id?: string;
  stacks: Opt[];
  owners: Opt[];
  initial?: Partial<Record<string, string | boolean | null>>;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({
    name: (initial?.name as string) ?? "",
    stack: (initial?.stack as string) ?? "", // stack NAME (pick from the datalist or type a new one)
    owner_bd_id: (initial?.owner_bd_id as string) ?? "",
    email: (initial?.email as string) ?? "",
    mobile: (initial?.mobile as string) ?? "",
    sim_owner: (initial?.sim_owner as string) ?? "",
    dob: (initial?.dob as string) ?? "",
    status: (initial?.status as string) ?? "active",
    notes: (initial?.notes as string) ?? "",
  });
  const [linkedinBanned, setLinkedinBanned] = useState<boolean>(!!initial?.linkedin_banned);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(id ? `/api/crm/profiles/${id}` : "/api/crm/profiles", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, linkedin_banned: linkedinBanned }),
    });
    const json = await res.json();
    if (!res.ok) { setBusy(false); return toast.error(json.error ?? "Failed to save"); }
    toast.success(id ? "Profile saved" : "Profile created");
    // Keep the button in its loading state through the navigation/refresh (the form unmounts on
    // navigate) so there's no dead gap between the toast and the page actually loading.
    if (onSaved) {
      onSaved();
      router.refresh();
      return;
    }
    router.push(id ? `/crm/profiles/${id}` : `/crm/profiles/${json.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-3">
      <FloatInput
        id="profile-name"
        label="Name *"
        hint="The persona's display name. Duplicates are fine: the profile number keeps them apart."
        required
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <StackField value={form.stack} onChange={(name) => set("stack", name)} stacks={stacks} />
      <FloatSelect
        id="profile-owner"
        label="Owner (BD)"
        hint="The BD who runs this profile's pipeline. Only they (and BD Leads or admins) see its leads."
        value={form.owner_bd_id}
        onChange={(e) => set("owner_bd_id", e.target.value)}
      >
        <option value="">Unassigned</option>
        {owners.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </FloatSelect>
      <FloatInput
        id="profile-email"
        label="Email"
        hint="The email address used when applying as this profile."
        type="email"
        value={form.email}
        onChange={(e) => set("email", e.target.value)}
      />
      <FloatInput
        id="profile-mobile"
        label="Mobile"
        hint="The phone number clients or recruiters may be given for this profile."
        value={form.mobile}
        onChange={(e) => set("mobile", e.target.value)}
      />
      <FloatInput
        id="profile-sim_owner"
        label="SIM owner"
        hint="Whose name the SIM for that mobile number is registered under. Can be anyone, including a non-employee."
        value={form.sim_owner}
        onChange={(e) => set("sim_owner", e.target.value)}
      />
      <DatePicker
        id="profile-dob"
        label="Date of birth"
        hint="Used when a client form asks for the persona's age or DOB."
        value={form.dob}
        onChange={(v) => set("dob", v)}
      />
      <FloatSelect
        id="profile-status"
        label="Status"
        hint="Inactive profiles stay in the archive but are hidden from day-to-day pickers."
        value={form.status}
        onChange={(e) => set("status", e.target.value)}
        className="capitalize"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </FloatSelect>
      <FloatInput
        id="profile-notes"
        label="Notes"
        hint="Internal warnings or context for BDs. Shown only here, never on the profile banner."
        value={form.notes}
        onChange={(e) => set("notes", e.target.value)}
        wrapClassName="sm:col-span-2"
      />
      <label className="flex items-center gap-2 self-center rounded-md border border-border px-3 py-2 text-sm text-text-primary">
        <input type="checkbox" checked={linkedinBanned} onChange={(e) => setLinkedinBanned(e.target.checked)} />
        <span>LinkedIn banned
          <span className="block text-caption text-text-secondary">Flags a red marker in the list, even while the profile is active.</span>
        </span>
      </label>
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : id ? "Save profile" : "Create profile"}</Button>
      </div>
    </form>
  );
}
