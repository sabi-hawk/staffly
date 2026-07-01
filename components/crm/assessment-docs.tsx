"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AssessmentDoc = {
  id: string;
  doc_type: "resume_cv" | "extra";
  label: string | null;
  file_name: string | null;
};

const selectCls = "h-8 rounded-md border border-border bg-white px-2 text-xs";

export function AssessmentDocs({ assessmentId, docs }: { assessmentId: string; docs: AssessmentDoc[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<"resume_cv" | "extra">("resume_cv");
  const [busy, setBusy] = useState(false);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Choose a file");
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("doc_type", docType);
    const res = await fetch(`/api/crm/assessments/${assessmentId}/documents`, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Upload failed");
    toast.success("Uploaded");
    setFile(null);
    const el = document.getElementById(`adoc-${assessmentId}`) as HTMLInputElement | null;
    if (el) el.value = "";
    router.refresh();
  }
  async function del(id: string) {
    if (!confirm("Delete this file?")) return;
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
            <Button variant="outline" size="sm" onClick={() => del(d.id)} aria-label="Delete"><Trash2 className="size-4" /></Button>
          </span>
        </div>
      ))}
      <form onSubmit={upload} className="flex items-center gap-2">
        <input id={`adoc-${assessmentId}`} type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
        <select className={selectCls} value={docType} onChange={(e) => setDocType(e.target.value as "resume_cv" | "extra")}>
          <option value="resume_cv">Resume/CV</option>
          <option value="extra">Extra</option>
        </select>
        <Button type="submit" size="sm" disabled={busy}>{busy ? "…" : "Upload"}</Button>
      </form>
    </div>
  );
}
