"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatInput } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FileInput } from "@/components/ui/file-input";
import { fileTooLargeMessage, uploadErrorMessage } from "@/lib/upload";

export type DealDoc = { id: string; label: string | null; file_name: string | null };

export function DealDocuments({ dealId, docs }: { dealId: string; docs: DealDoc[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0); // remount FileInput after a successful upload
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Choose a file");
    const tooBig = fileTooLargeMessage(file);
    if (tooBig) return toast.error(tooBig);
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("label", label);
    const res = await fetch(`/api/crm/deals/${dealId}/documents`, { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) return toast.error(await uploadErrorMessage(res));
    toast.success("Uploaded");
    setFile(null);
    setLabel("");
    setFileKey((k) => k + 1);
    router.refresh();
  }
  async function del(id: string) {
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
            <Button variant="outline" size="sm" onClick={() => setPendingDelete(d.id)} aria-label="Delete"><Trash2 className="size-4" /></Button>
          </span>
        </div>
      ))}
      <form onSubmit={upload} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <FileInput key={fileKey} id={`ddoc-${dealId}`} file={file} onChange={setFile} accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" className="w-64" />
        <FloatInput
          id="deal-doc-label"
          label="Label"
          hint="A short name for this file, e.g. Contract, so it is easy to spot in the list."
          wrapClassName="w-44"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button>
      </form>
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="Delete this file?"
        description="The file will be removed from this deal."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => del(pendingDelete!)}
      />
    </div>
  );
}
