"use client";
// Assign a role to an employee (super-admin / users.assign_roles). Assignment also syncs the legacy
// base role + capability flags server-side. Shows the selected role's description as a hint.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type RoleOpt = { id: string; key: string; name: string; description: string | null };

export function RoleAssign({ employeeId, roles, currentRoleId }: { employeeId: string; roles: RoleOpt[]; currentRoleId: string | null }) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(currentRoleId ?? "");
  const [busy, setBusy] = useState(false);
  const selected = roles.find((r) => r.id === roleId);

  async function save() {
    if (!roleId) return toast.error("Pick a role");
    setBusy(true);
    const res = await fetch(`/api/admin/employees/${employeeId}/role`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role_id: roleId }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(j.error ?? "Failed to assign");
    toast.success("Role assigned");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          aria-label="Role"
          className="h-9 min-w-[220px] rounded-md border border-border bg-white px-3 text-sm"
        >
          <option value="">Select a role…</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <Button size="sm" onClick={save} disabled={busy || roleId === (currentRoleId ?? "")}>
          {busy ? "Saving…" : "Assign role"}
        </Button>
      </div>
      {selected?.description && <p className="text-caption text-text-secondary">{selected.description}</p>}
    </div>
  );
}
