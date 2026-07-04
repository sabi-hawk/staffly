"use client";
// Attach resumes / files to a lead (deal-specific). Upload, download (signed URL), delete.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, Download, Trash2 } from "lucide-react";

type Doc = { id: string; label: string | null; file_name: string | null; doc_type: string };

export function LeadDocuments({ leadId, docs }: { leadId: string; docs: Doc[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<Doc[]>(docs); // local list so up/downloads reflect immediately

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", "resume");
    fd.append("label", file.name);
    const res = await fetch(`/api/crm/leads/${leadId}/documents`, { method: "POST", body: fd });
    setBusy(false);
    e.target.value = "";
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(json.error ?? "Upload failed");
    if (json.doc) setList((l) => [json.doc, ...l]); // optimistic — show without waiting for a refetch
    toast.success("Resume attached");
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm("Remove this file?")) return;
    const res = await fetch(`/api/crm/lead-documents/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not remove the file");
    setList((l) => l.filter((d) => d.id !== id));
    toast.success("Removed");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface">
        <Paperclip className="size-4" /> {busy ? "Uploading…" : "Attach resume / file"}
        <input type="file" className="hidden" disabled={busy} onChange={upload} accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" />
      </label>
      {list.length === 0 ? (
        <p className="text-caption text-text-secondary">No files attached. Attach a resume specific to this deal.</p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <a href={`/api/crm/lead-documents/${d.id}`} className="inline-flex items-center gap-2 text-brand-primary hover:underline">
                <Download className="size-4" /> {d.label || d.file_name || "file"}
              </a>
              <button onClick={() => del(d.id)} className="rounded-md p-1 text-text-secondary hover:text-danger" title="Remove" aria-label="Remove file">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
