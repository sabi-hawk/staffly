"use client";
// Attach resumes / files to a lead (deal-specific). Upload, download (signed URL), delete.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FileInput } from "@/components/ui/file-input";

type Doc = { id: string; label: string | null; file_name: string | null; doc_type: string };

export function LeadDocuments({ leadId, docs }: { leadId: string; docs: Doc[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0); // remount FileInput after each upload attempt
  const [list, setList] = useState<Doc[]>(docs); // local list so up/downloads reflect immediately
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function upload(f: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("doc_type", "resume");
    fd.append("label", f.name);
    const res = await fetch(`/api/crm/leads/${leadId}/documents`, { method: "POST", body: fd });
    setBusy(false);
    setFile(null);
    setFileKey((k) => k + 1);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(json.error ?? "Upload failed");
    if (json.doc) setList((l) => [json.doc, ...l]); // optimistic — show without waiting for a refetch
    toast.success("Resume attached");
    router.refresh();
  }

  async function del(id: string) {
    const res = await fetch(`/api/crm/lead-documents/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not remove the file");
    setList((l) => l.filter((d) => d.id !== id));
    toast.success("Removed");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <FileInput
        key={fileKey}
        file={file}
        disabled={busy}
        accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
        placeholder={busy ? "Uploading…" : "Attach resume / file"}
        onChange={(f) => { setFile(f); if (f) upload(f); }}
      />
      {list.length === 0 ? (
        <p className="text-caption text-text-secondary">No files attached. Attach a resume specific to this deal.</p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <a href={`/api/crm/lead-documents/${d.id}`} className="inline-flex items-center gap-2 text-brand-primary hover:underline">
                <Download className="size-4" /> {d.label || d.file_name || "file"}
              </a>
              <button onClick={() => setPendingDelete(d.id)} className="rounded-md p-1 text-text-secondary hover:text-danger" title="Remove" aria-label="Remove file">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="Remove this file?"
        description="The file will be removed from this lead."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={async () => { await del(pendingDelete!); }}
      />
    </div>
  );
}
