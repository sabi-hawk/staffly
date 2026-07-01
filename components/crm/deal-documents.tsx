"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export type DealDoc = { id: string; label: string | null; file_name: string | null };

export function DealDocuments({ dealId, docs }: { dealId: string; docs: DealDoc[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Choose a file");
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("label", label);
    const res = await fetch(`/api/crm/deals/${dealId}/documents`, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Upload failed");
    toast.success("Uploaded");
    setFile(null);
    setLabel("");
    const el = document.getElementById(`ddoc-${dealId}`) as HTMLInputElement | null;
    if (el) el.value = "";
    router.refresh();
  }
  async function del(id: string) {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`/api/crm/deal-documents/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); router.refresh(); } else toast.error("Failed");
  }

  return (
    <div className="space-y-3">
      {docs.length === 0 && <div className="text-caption text-text-secondary">No documents.</div>}
      {docs.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
          <span className="truncate">{d.label || d.file_name}</span>
          <span className="flex shrink-0 gap-1.5">
            <Button asChild variant="outline" size="sm"><a href={`/api/crm/deal-documents/${d.id}`}><Download className="size-4" /> Download</a></Button>
            <Button variant="outline" size="sm" onClick={() => del(d.id)} aria-label="Delete"><Trash2 className="size-4" /></Button>
          </span>
        </div>
      ))}
      <form onSubmit={upload} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <div className="space-y-1.5">
          <Label>File</Label>
          <input id={`ddoc-${dealId}`} type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>
        <div className="space-y-1.5"><Label>Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Contract" className="w-40" /></div>
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button>
      </form>
    </div>
  );
}
