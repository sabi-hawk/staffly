"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatInput } from "@/components/ui/field";

// Admin-only. The plaintext is NOT sent in the page payload — it's fetched lazily on "Reveal".
export function PasswordPanel({ profileId, hasPassword }: { profileId: string; hasPassword: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [loaded, setLoaded] = useState(false); // fetched the current value at least once
  const [dirty, setDirty] = useState(false); // user edited the field
  const [busy, setBusy] = useState(false);

  async function fetchValue() {
    const res = await fetch(`/api/crm/profiles/${profileId}/password`);
    if (!res.ok) { toast.error("Could not load password"); return false; }
    const j = await res.json();
    setValue(j.password ?? "");
    setLoaded(true);
    return true;
  }

  async function toggleReveal() {
    if (!reveal && !loaded && hasPassword) {
      if (!(await fetchValue())) return;
    }
    setReveal((r) => !r);
  }

  async function copy() {
    if (!loaded && hasPassword && !(await fetchValue())) return;
    navigator.clipboard.writeText(value);
    toast.success("Copied");
  }

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/crm/profiles/${profileId}/password`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: value }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed");
    toast.success("Password saved");
    setDirty(false);
    setLoaded(true);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FloatInput
        id={`profile-password-${profileId}`}
        label="Account password (admin-only)"
        hint="The login password for this profile's accounts. It is never sent with the page; it loads only when you reveal or copy it, and only admins can see it."
        type={reveal ? "text" : "password"}
        value={value}
        onChange={(e) => { setValue(e.target.value); setDirty(true); setLoaded(true); }}
        wrapClassName="w-64"
        className="font-mono"
      />
      <Button type="button" variant="outline" size="sm" onClick={toggleReveal}>
        {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        {reveal ? "Hide" : "Reveal"}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={!hasPassword && !value} onClick={copy}>
        <Copy className="size-4" /> Copy
      </Button>
      <Button type="button" size="sm" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
    </div>
  );
}
