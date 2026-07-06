"use client";
// Create / edit a role: name, description, REASON (why it exists — required practice), and the
// permission matrix grouped by module. Used by /admin/roles for both custom roles and tuning the
// grants of system defaults (which can't be deleted).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export type PermRow = { key: string; module: string; label: string; description: string | null };

export function RoleEditor({
  catalog,
  initial,
  roleId,
  isSystem = false,
  onDone,
}: {
  catalog: PermRow[];
  initial?: { name: string; description: string | null; reason: string | null; grants: string[] };
  roleId?: string;
  isSystem?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [grants, setGrants] = useState<Set<string>>(new Set(initial?.grants ?? []));
  const [busy, setBusy] = useState(false);

  const modules = Array.from(new Set(catalog.map((p) => p.module)));
  const toggle = (key: string) =>
    setGrants((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleModule = (mod: string) => {
    const keys = catalog.filter((p) => p.module === mod).map((p) => p.key);
    const allOn = keys.every((k) => grants.has(k));
    setGrants((s) => { const n = new Set(s); keys.forEach((k) => (allOn ? n.delete(k) : n.add(k))); return n; });
  };

  async function save() {
    if (!name.trim()) return toast.error("Give the role a name");
    setBusy(true);
    const res = await fetch(roleId ? `/api/admin/roles/${roleId}` : "/api/admin/roles", {
      method: roleId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description, reason, permissions: Array.from(grants) }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(j.error ?? "Failed to save");
    toast.success(roleId ? "Role saved" : "Role created");
    onDone?.();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="role-name">Name *</Label>
          <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Recruiter" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-desc">Description</Label>
          <Input id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One line on what this role is" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="role-reason">Reason it exists</Label>
          <Input id="role-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this role was created — kept as its permanent note" />
        </div>
      </div>

      <div className="space-y-3">
        {modules.map((mod) => {
          const perms = catalog.filter((p) => p.module === mod);
          const onCount = perms.filter((p) => grants.has(p.key)).length;
          return (
            <div key={mod} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">{mod} <span className="font-normal text-text-secondary">({onCount}/{perms.length})</span></span>
                <button type="button" onClick={() => toggleModule(mod)} className="text-caption text-brand-primary hover:underline">
                  {perms.every((p) => grants.has(p.key)) ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {perms.map((p) => (
                  <label key={p.key} className="flex items-start gap-2 text-sm" title={p.description ?? undefined}>
                    <input type="checkbox" className="mt-0.5" checked={grants.has(p.key)} onChange={() => toggle(p.key)} />
                    <span>
                      <span className="text-text-primary">{p.label}</span>
                      <span className="ml-1.5 text-[11px] text-text-secondary">{p.key}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : roleId ? "Save role" : "Create role"}</Button>
        {onDone && <Button variant="outline" onClick={onDone} disabled={busy}>Cancel</Button>}
        {isSystem && <span className="text-caption text-text-secondary">System role — grants and text are editable; it can't be deleted.</span>}
      </div>
    </div>
  );
}
