"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type Doc = {
  id: string;
  doc_type: "resume" | "cover_letter";
  label: string | null;
  is_primary: boolean;
  file_name: string | null;
};

const selectCls = "h-9 rounded-md border border-border bg-white px-3 text-sm";

function DocRow({
  d,
  canManage,
  onPrimary,
  onDelete,
}: {
  d: Doc;
  canManage: boolean;
  onPrimary: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{d.label || d.file_name || "Document"}</span>
          {d.is_primary && <Badge tone="success">Primary</Badge>}
        </div>
        <div className="truncate text-caption text-text-secondary">{d.file_name}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/crm/documents/${d.id}/download`}><Download className="size-4" /> Download</a>
        </Button>
        {canManage && d.doc_type === "resume" && !d.is_primary && (
          <Button variant="outline" size="sm" onClick={() => onPrimary(d.id)}><Star className="size-4" /> Primary</Button>
        )}
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => onDelete(d.id)} aria-label="Delete"><Trash2 className="size-4" /></Button>
        )}
      </div>
    </div>
  );
}

export function DocumentsPanel({
  profileId,
  docs,
  canManage,
}: {
  profileId: string;
  docs: Doc[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<"resume" | "cover_letter">("resume");
  const [label, setLabel] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Choose a file");
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("doc_type", docType);
    fd.set("label", label);
    fd.set("is_primary", String(isPrimary));
    const res = await fetch(`/api/crm/profiles/${profileId}/documents`, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Upload failed");
    toast.success("Uploaded");
    setFile(null);
    setLabel("");
    setIsPrimary(false);
    const input = document.getElementById("crm-doc-file") as HTMLInputElement | null;
    if (input) input.value = "";
    router.refresh();
  }

  async function setPrimary(id: string) {
    const res = await fetch(`/api/crm/documents/${id}`, { method: "PATCH" });
    if (res.ok) { toast.success("Primary resume set"); router.refresh(); } else toast.error("Failed");
  }
  async function del(id: string) {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/crm/documents/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); router.refresh(); } else toast.error("Failed");
  }

  const resumes = docs.filter((d) => d.doc_type === "resume");
  const covers = docs.filter((d) => d.doc_type === "cover_letter");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-caption font-medium text-text-secondary">Resumes</div>
        {resumes.length === 0 && <div className="text-caption text-text-secondary">No resumes yet.</div>}
        {resumes.map((d) => <DocRow key={d.id} d={d} canManage={canManage} onPrimary={setPrimary} onDelete={del} />)}
      </div>
      <div className="space-y-2">
        <div className="text-caption font-medium text-text-secondary">Cover letter</div>
        {covers.length === 0 && <div className="text-caption text-text-secondary">No cover letter.</div>}
        {covers.map((d) => <DocRow key={d.id} d={d} canManage={canManage} onPrimary={setPrimary} onDelete={del} />)}
      </div>

      {canManage && (
        <form onSubmit={upload} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="crm-doc-file">File</Label>
            <input
              id="crm-doc-file"
              type="file"
              accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm-doc-type">Type</Label>
            <select id="crm-doc-type" className={selectCls} value={docType} onChange={(e) => setDocType(e.target.value as "resume" | "cover_letter")}>
              <option value="resume">Resume</option>
              <option value="cover_letter">Cover letter</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm-doc-label">Label</Label>
            <Input id="crm-doc-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Full Stack" className="w-40" />
          </div>
          {docType === "resume" && (
            <label className="flex h-9 items-center gap-1.5 text-sm">
              <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} /> Primary
            </label>
          )}
          <Button type="submit" size="sm" disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button>
        </form>
      )}
    </div>
  );
}
