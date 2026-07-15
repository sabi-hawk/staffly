"use client";
// Account password for a dev profile. The plaintext is NEVER in the page payload — it loads lazily
// on Reveal/Copy. Whether a password EXISTS is shown clearly (dots vs "Not set"). Admins can edit it
// (behind an Edit action; empty is allowed = no password); a BD who owns the profile can only
// reveal/copy it (to log in as that persona). RLS also enforces read/write access.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, Pencil, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloatInput } from "@/components/ui/field";

export function PasswordPanel({
  profileId,
  hasPassword,
  canEdit,
}: {
  profileId: string;
  hasPassword: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(""); // real plaintext (loaded on reveal or typed while editing)
  const [reveal, setReveal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // which async action is in flight ("reveal"|"copy"|"edit"|"save"), + the refresh transition after save.
  const [busy, setBusy] = useState<null | "reveal" | "copy" | "edit" | "save">(null);
  const [pending, startTransition] = useTransition();
  const anyBusy = busy !== null || pending;

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
      setBusy("reveal"); const ok = await fetchValue(); setBusy(null);
      if (!ok) return;
    }
    setReveal((r) => !r);
  }

  async function copy() {
    if (!loaded && hasPassword) {
      setBusy("copy"); const ok = await fetchValue(); setBusy(null);
      if (!ok) return;
    }
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  }

  async function startEdit() {
    // preload the current value so the admin can tweak it (they can reveal it anyway)
    if (hasPassword && !loaded) {
      setBusy("edit"); const ok = await fetchValue(); setBusy(null);
      if (!ok) return;
    }
    setEditing(true);
  }

  async function save() {
    setBusy("save");
    const res = await fetch(`/api/crm/profiles/${profileId}/password`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: value }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(null); return toast.error(json.error ?? "Failed"); }
    toast.success(value.trim() ? "Password saved" : "Password cleared");
    setEditing(false);
    setLoaded(true);
    setBusy(null);
    startTransition(() => router.refresh()); // keeps a pending state through the refetch
  }

  const spin = <Loader2 className="size-4 animate-spin" />;

  // ── Edit mode (admins only) ──────────────────────────────────────────────
  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <FloatInput
          id={`profile-password-${profileId}`}
          label="Account password"
          hint="Leave empty to clear it. You can fill it in later."
          type={reveal ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          wrapClassName="w-64"
          className="font-mono"
          autoFocus
        />
        <Button type="button" variant="outline" size="sm" onClick={() => setReveal((r) => !r)} disabled={anyBusy}>
          {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{reveal ? "Hide" : "Show"}
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={anyBusy}>{busy === "save" || pending ? <>{spin} Saving…</> : "Save"}</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(false); setReveal(false); }} disabled={anyBusy}>Cancel</Button>
      </div>
    );
  }

  // ── View mode ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-10 w-64 items-center gap-2 rounded-md border border-border bg-surface/50 px-3 font-mono text-sm">
        <KeyRound className="size-4 shrink-0 text-text-secondary" />
        {hasPassword ? (
          <span className={reveal ? "truncate text-text-primary" : "tracking-[0.2em] text-text-primary"}>
            {reveal && loaded ? (value || "—") : "••••••••••"}
          </span>
        ) : (
          <span className="font-sans text-text-secondary">No password set</span>
        )}
      </div>
      {hasPassword ? <Badge tone="success">Set</Badge> : <Badge tone="neutral">Not set</Badge>}

      {hasPassword && (
        <>
          <Button type="button" variant="outline" size="sm" onClick={toggleReveal} disabled={anyBusy}>
            {busy === "reveal" ? spin : reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{reveal ? "Hide" : "Reveal"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={copy} disabled={anyBusy}>
            {busy === "copy" ? spin : <Copy className="size-4" />} Copy
          </Button>
        </>
      )}
      {canEdit && (
        <Button type="button" variant={hasPassword ? "outline" : "default"} size="sm" onClick={startEdit} disabled={anyBusy}>
          {busy === "edit" ? <>{spin} Loading…</> : hasPassword ? <><Pencil className="size-3.5" /> Edit</> : <><KeyRound className="size-4" /> Set password</>}
        </Button>
      )}
    </div>
  );
}
