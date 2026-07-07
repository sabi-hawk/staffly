"use client";
// CRM configuration: manage the dev-profile Stack list (add, rename, activate/deactivate) in one
// place. Opened from the CRM Profiles page (crm.profiles.manage holders). Writes go straight to
// dev_stacks (RLS gates them). Deactivating keeps a stack on existing profiles but hides it from
// the pickers; stacks in use cannot be hard-deleted, so we deactivate instead.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, Plus, Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FloatInput } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

type Stack = { id: string; name: string; is_active: boolean; sort_order: number };

export function StacksManager() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    const { data } = await createClient()
      .from("dev_stacks").select("id, name, is_active, sort_order").order("is_active", { ascending: false }).order("name");
    setStacks((data ?? []) as Stack[]);
  }
  useEffect(() => { if (open) load(); }, [open]);

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const nextOrder = Math.max(0, ...stacks.map((s) => s.sort_order)) + 1;
    const { error } = await createClient().from("dev_stacks").insert({ name, sort_order: nextOrder });
    setBusy(false);
    if (error) return toast.error(/duplicate|unique/i.test(error.message) ? "That stack already exists." : error.message);
    toast.success("Stack added");
    setNewName("");
    load();
    router.refresh();
  }

  async function toggleActive(s: Stack) {
    const { error } = await createClient().from("dev_stacks").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
    router.refresh();
  }

  async function saveRename(id: string) {
    const name = editName.trim();
    if (!name) return;
    const { error } = await createClient().from("dev_stacks").update({ name }).eq("id", id);
    if (error) return toast.error(/duplicate|unique/i.test(error.message) ? "That name is taken." : error.message);
    setEditId(null);
    load();
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Layers className="size-4" /> Manage stacks</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Manage stacks</DialogTitle>
          <DialogDescription>The tech stacks a profile can be tagged with. These feed the Stack dropdown on every profile.</DialogDescription>

          <div className="mt-3 flex items-end gap-2">
            <FloatInput
              id="new-stack"
              label="New stack"
              hint="Add a stack, e.g. Mobile (React Native), DevOps, Data Engineer."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              wrapClassName="flex-1"
            />
            <Button size="sm" onClick={add} disabled={busy || !newName.trim()}><Plus className="size-4" /> Add</Button>
          </div>

          <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
            {stacks.length === 0 && <p className="py-4 text-center text-caption text-text-secondary">No stacks yet.</p>}
            {stacks.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                {editId === s.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveRename(s.id); if (e.key === "Escape") setEditId(null); }}
                    className="h-8 flex-1 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/70"
                  />
                ) : (
                  <span className="flex items-center gap-2">
                    <span className={s.is_active ? "text-text-primary" : "text-text-secondary line-through"}>{s.name}</span>
                    {!s.is_active && <Badge tone="neutral">inactive</Badge>}
                  </span>
                )}
                <span className="flex shrink-0 items-center gap-1">
                  {editId === s.id ? (
                    <>
                      <button onClick={() => saveRename(s.id)} className="rounded-md p-1.5 text-success hover:bg-surface" aria-label="Save"><Check className="size-4" /></button>
                      <button onClick={() => setEditId(null)} className="rounded-md p-1.5 text-text-secondary hover:bg-surface" aria-label="Cancel"><X className="size-4" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditId(s.id); setEditName(s.name); }} className="rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary" aria-label={`Rename ${s.name}`}><Pencil className="size-3.5" /></button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(s)}>{s.is_active ? "Deactivate" : "Activate"}</Button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
