"use client";
// Edit / delete an announcement (announcements.manage — RLS enforces). Edit opens an inline form.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function AnnouncementActions({ id, title, body }: { id: string; title: string; body: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(title);
  const [b, setB] = useState(body ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!t.trim()) return toast.error("Title is required");
    setBusy(true);
    const { error } = await createClient().from("announcements")
      .update({ title: t.trim(), body_text: b.trim() || null }).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Announcement updated");
    setEditing(false);
    router.refresh();
  }

  async function del() {
    if (busy || !confirm("Delete this announcement? Everyone loses it.")) return;
    setBusy(true);
    const { error } = await createClient().from("announcements").delete().eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Announcement deleted");
    router.refresh();
  }

  if (editing) {
    return (
      <div className="mt-3 space-y-2 rounded-md border border-border bg-surface/40 p-3">
        <div className="space-y-1.5">
          <Label htmlFor={`ann-t-${id}`}>Title</Label>
          <Input id={`ann-t-${id}`} value={t} onChange={(e) => setT(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`ann-b-${id}`}>Body</Label>
          <Textarea id={`ann-b-${id}`} value={b} onChange={(e) => setB(e.target.value)} rows={3} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy}><X className="size-4" /> Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <span className="flex shrink-0 gap-1">
      <Button size="sm" variant="outline" onClick={() => setEditing(true)} aria-label="Edit announcement"><Pencil className="size-3.5" /></Button>
      <Button size="sm" variant="outline" onClick={del} aria-label="Delete announcement"><Trash2 className="size-3.5" /></Button>
    </span>
  );
}
