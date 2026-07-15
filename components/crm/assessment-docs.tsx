"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { FileInput } from "@/components/ui/file-input";
import { FloatSelect } from "@/components/ui/field";
import { fileTooLargeMessage, uploadErrorMessage } from "@/lib/upload";

export type AssessmentDoc = {
  id: string;
  doc_type: "resume_cv" | "extra";
  label: string | null;
  file_name: string | null;
};

export function AssessmentDocs({ assessmentId, docs }: { assessmentId: string; docs: AssessmentDoc[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0); // remount FileInput after a successful upload
  const [docType, setDocType] = useState<"resume_cv" | "extra">("resume_cv");
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
    fd.set("doc_type", docType);
    const res = await fetch(`/api/crm/assessments/${assessmentId}/documents`, { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) return toast.error(await uploadErrorMessage(res));
    toast.success("Uploaded");
    setFile(null);
    setFileKey((k) => k + 1);
    router.refresh();
  }
  async function del(id: string) {
    const res = await fetch(`/api/crm/assessment-documents/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); router.refresh(); } else toast.error("Failed");
  }

  return (
    <div className="space-y-2">
      {docs.length === 0 && <div className="text-caption text-text-secondary">No files.</div>}
      {docs.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
          <span className="truncate">{d.label || d.file_name} <span className="text-caption text-text-secondary">({d.doc_type})</span></span>
          <span className="flex shrink-0 gap-1">
            <Button asChild variant="outline" size="sm"><a href={`/api/crm/assessment-documents/${d.id}`}><Download className="size-4" /></a></Button>
            <Button variant="outline" size="sm" onClick={() => setPendingDelete(d.id)} aria-label="Delete"><Trash2 className="size-4" /></Button>
          </span>
        </div>
      ))}
      <form onSubmit={upload} className="flex items-center gap-2">
        <FileInput
          key={fileKey}
          id={`adoc-${assessmentId}`}
          file={file}
          onChange={setFile}
          accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
          className="min-w-0 flex-1"
        />
        <FloatSelect
          id={`adoc-type-${assessmentId}`}
          label="Type"
          hint="Resume/CV is the resume sent with this assessment; Extra is any other supporting file."
          wrapClassName="w-40 shrink-0"
          value={docType}
          onChange={(e) => setDocType(e.target.value as "resume_cv" | "extra")}
        >
          <option value="resume_cv">Resume/CV</option>
          <option value="extra">Extra</option>
        </FloatSelect>
        <Button type="submit" size="sm" disabled={busy}>{busy ? "…" : "Upload"}</Button>
      </form>
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="Delete this file?"
        description="The file will be removed from this assessment."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => del(pendingDelete!)}
      />
    </div>
  );
}
