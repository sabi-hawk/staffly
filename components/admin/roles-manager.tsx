"use client";
// Roles & permissions manager (super-admin): list every role with its reason + grant count + user
// count; expand to edit its grants; create custom roles; delete unused custom roles.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Lock, X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { RoleEditor, type PermRow } from "./role-editor";

export type RoleRow = {
  id: string; key: string; name: string; description: string | null; reason: string | null;
  is_system: boolean; grants: string[]; users: number;
};

// Roles whose assignment auto-sets a capability flag on the employee's profile
// (see /api/admin/employees/[id]/role). Surfaced on the card so it's never a surprise.
const ROLE_FLAGS: Record<string, { flag: string; tip: string; className: string }> = {
  bd_lead: {
    flag: "is_bd_lead",
    tip: "Assigning this role also sets the employee's BD-Lead flag: all-BD scope in CRM (sees and can fix every BD's records).",
    className: "border-warning/40 bg-warning/10 text-warning",
  },
  deal_developer: {
    flag: "is_deal_developer",
    tip: "Assigning this role also sets the deal-developer flag: leave balances hidden and leave requests record-only; the client company governs their leave.",
    className: "border-brand-primary/40 bg-brand-light text-brand-primary",
  },
};

/** Coloured flag chip with an instant CSS tooltip (native title has a long hover delay). */
function FlagChip({ flag, tip, className }: { flag: string; tip: string; className: string }) {
  return (
    <span className={`group relative inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      <Flag className="size-3" /> {flag}
      <span className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 hidden w-72 rounded-md bg-text-primary px-2.5 py-1.5 text-left text-xs font-normal text-white shadow-card group-hover:block">
        {tip}
      </span>
    </span>
  );
}

export function RolesManager({ roles, catalog }: { roles: RoleRow[]; catalog: PermRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null); // role id or "new"
  const [pendingDelete, setPendingDelete] = useState<RoleRow | null>(null);

  async function del(r: RoleRow) {
    const res = await fetch(`/api/admin/roles/${r.id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(j.error ?? "Failed");
    toast.success("Role deleted");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {editing === "new" ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="size-4" /> Cancel</Button>
        ) : (
          <Button size="sm" onClick={() => setEditing("new")}><Plus className="size-4" /> New custom role</Button>
        )}
      </div>

      {editing === "new" && (
        <div className="rounded-lg border border-brand-primary/40 bg-brand-light/20 p-4">
          <h3 className="mb-3 font-semibold text-text-primary">New custom role</h3>
          <RoleEditor catalog={catalog} onDone={() => setEditing(null)} />
        </div>
      )}

      {roles.map((r) => (
        <div key={r.id} className="rounded-lg border border-border p-4">
          {/* no flex-wrap: a long reason must never push the actions below the text */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-text-primary">{r.name}</span>
                {r.is_system && <Badge tone="neutral"><Lock className="mr-1 size-3" /> system</Badge>}
                <Badge tone="brand">{r.grants.length} permissions</Badge>
                <Badge tone={r.users > 0 ? "success" : "neutral"}>{r.users} user{r.users === 1 ? "" : "s"}</Badge>
                {ROLE_FLAGS[r.key] && <FlagChip {...ROLE_FLAGS[r.key]} />}
              </div>
              {r.description && <p className="mt-1 text-sm text-text-secondary">{r.description}</p>}
              {r.reason && <p className="mt-1 text-caption text-text-secondary"><span className="font-medium text-text-primary">Why it exists:</span> {r.reason}</p>}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setEditing(editing === r.id ? null : r.id)} aria-label={`Edit ${r.name}`}>
                {editing === r.id ? <X className="size-4" /> : <Pencil className="size-4" />}
              </Button>
              {!r.is_system && (
                <Button size="sm" variant="outline" onClick={() => setPendingDelete(r)} aria-label={`Delete ${r.name}`}><Trash2 className="size-4" /></Button>
              )}
            </div>
          </div>
          {editing === r.id && (
            <div className="mt-4 border-t border-border pt-4">
              <RoleEditor
                catalog={catalog}
                roleId={r.id}
                isSystem={r.is_system}
                initial={{ name: r.name, description: r.description, reason: r.reason, grants: r.grants }}
                onDone={() => setEditing(null)}
              />
            </div>
          )}
        </div>
      ))}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title={pendingDelete ? `Delete the "${pendingDelete.name}" role?` : "Delete this role?"}
        description="The role and its permission grants are removed."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => { await del(pendingDelete!); }}
      />
    </div>
  );
}
