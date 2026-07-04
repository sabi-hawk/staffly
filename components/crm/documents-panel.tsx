"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Eye, Star, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCrmDate } from "@/lib/utils";

export type Doc = {
  id: string;
  doc_type: "resume" | "cover_letter";
  label: string | null;
  note: string | null;
  is_primary: boolean;
  file_name: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
  deleted_by_name?: string | null;
};

const selectCls = "h-9 rounded-md border border-border bg-white px-3 text-sm";

/** Only PDFs and images render in the browser iframe; DOC/DOCX must be downloaded. */
const canPreview = (d: Doc) => /\.(pdf|png|jpe?g|webp)$/i.test(d.file_name ?? "");

/** In-browser viewer — an iframe of the inline signed URL (no download). Works for PDF/images. */
function ViewerModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-4" onClick={onClose}>
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="truncate text-sm font-medium">{doc.label || doc.file_name || "Document"}</span>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/crm/documents/${doc.id}/download`}><Download className="size-4" /> Download</a>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
          </div>
        </div>
        <div className="relative flex-1">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
          <iframe
            title="Document viewer"
            src={`/api/crm/documents/${doc.id}/download?inline=1`}
            onLoad={() => setLoading(false)}
            className="h-full w-full bg-surface"
          />
        </div>
      </div>
    </div>
  );
}

function DocRow({
  d,
  canEdit,
  onView,
  onPrimary,
  onNote,
  onDelete,
}: {
  d: Doc;
  canEdit: boolean;
  onView: (d: Doc) => void;
  onPrimary: (id: string) => void;
  onNote: (d: Doc) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{d.label || d.file_name || "Document"}</span>
            {d.is_primary && <Badge tone="success">Primary</Badge>}
          </div>
          <div className="truncate text-caption text-text-secondary">{d.file_name}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canPreview(d) && (
            <Button variant="outline" size="sm" onClick={() => onView(d)} aria-label="View"><Eye className="size-4" /> View</Button>
          )}
          <Button asChild variant="outline" size="sm">
            <a href={`/api/crm/documents/${d.id}/download`} aria-label="Download"><Download className="size-4" /></a>
          </Button>
          {canEdit && d.doc_type === "resume" && !d.is_primary && (
            <Button variant="outline" size="sm" onClick={() => onPrimary(d.id)} aria-label="Make primary"><Star className="size-4" /></Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => onNote(d)} aria-label="Edit note"><Pencil className="size-4" /></Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => onDelete(d.id)} aria-label="Delete"><Trash2 className="size-4" /></Button>
          )}
        </div>
      </div>
      {d.note && <div className="mt-1.5 border-t border-border pt-1.5 text-caption text-text-secondary">{d.note}</div>}
    </div>
  );
}

export function DocumentsPanel({
  profileId,
  docs,
  deletedDocs,
  canEdit,
  isAdmin,
}: {
  profileId: string;
  docs: Doc[];
  deletedDocs: Doc[];
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<"resume" | "cover_letter">("resume");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [viewing, setViewing] = useState<Doc | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Choose a file");
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("doc_type", docType);
    fd.set("label", label);
    fd.set("note", note);
    fd.set("is_primary", String(isPrimary));
    const res = await fetch(`/api/crm/profiles/${profileId}/documents`, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Upload failed");
    toast.success("Uploaded");
    setFile(null);
    setLabel("");
    setNote("");
    setIsPrimary(false);
    const input = document.getElementById("crm-doc-file") as HTMLInputElement | null;
    if (input) input.value = "";
    router.refresh();
  }

  async function act(id: string, body: Record<string, unknown>, ok: string) {
    const res = await fetch(`/api/crm/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { toast.success(ok); router.refresh(); }
    else { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Failed"); }
  }
  const setPrimary = (id: string) => act(id, { action: "primary" }, "Primary resume set");
  const softDelete = (id: string) => { if (confirm("Delete this document? An admin can still recover it from history.")) act(id, { action: "delete" }, "Deleted"); };
  function editNote(d: Doc) {
    const next = prompt("Note (what this document is for)", d.note ?? "");
    if (next === null) return; // cancelled
    act(d.id, { action: "note", note: next.trim() || null }, "Note saved");
  }

  // Admin-only HARD delete from history (removes the storage object too).
  async function hardDelete(id: string) {
    if (!confirm("Permanently delete this document? This removes the file and cannot be undone.")) return;
    const res = await fetch(`/api/crm/documents/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Permanently deleted"); router.refresh(); }
    else { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Failed"); }
  }

  const resumes = docs.filter((d) => d.doc_type === "resume");
  const covers = docs.filter((d) => d.doc_type === "cover_letter");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-caption font-medium text-text-secondary">Resumes</div>
        {resumes.length === 0 && <div className="text-caption text-text-secondary">No resumes yet.</div>}
        {resumes.map((d) => <DocRow key={d.id} d={d} canEdit={canEdit} onView={setViewing} onPrimary={setPrimary} onNote={editNote} onDelete={softDelete} />)}
      </div>
      <div className="space-y-2">
        <div className="text-caption font-medium text-text-secondary">Cover letters</div>
        {covers.length === 0 && <div className="text-caption text-text-secondary">No cover letters.</div>}
        {covers.map((d) => <DocRow key={d.id} d={d} canEdit={canEdit} onView={setViewing} onPrimary={setPrimary} onNote={editNote} onDelete={softDelete} />)}
      </div>

      {canEdit && (
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
          <div className="space-y-1.5">
            <Label htmlFor="crm-doc-note">Note</Label>
            <Input id="crm-doc-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What it's for (optional)" className="w-48" />
          </div>
          {docType === "resume" && (
            <label className="flex h-9 items-center gap-1.5 text-sm">
              <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} /> Primary
            </label>
          )}
          <Button type="submit" size="sm" disabled={busy}>{busy ? <><Loader2 className="size-4 animate-spin" /> Uploading…</> : "Upload"}</Button>
        </form>
      )}

      {isAdmin && deletedDocs.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <div className="text-caption font-medium text-text-secondary">Deleted (history)</div>
          {deletedDocs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border bg-surface/40 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-text-secondary line-through">{d.label || d.file_name || "Document"}</div>
                <div className="truncate text-caption text-text-secondary">
                  {d.file_name} · deleted {formatCrmDate(d.deleted_at)}{d.deleted_by_name ? ` by ${d.deleted_by_name}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {canPreview(d) && (
                  <Button variant="outline" size="sm" onClick={() => setViewing(d)} aria-label="View"><Eye className="size-4" /></Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/crm/documents/${d.id}/download`} aria-label="Download"><Download className="size-4" /></a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => hardDelete(d.id)} aria-label="Permanently delete"><Trash2 className="size-4 text-danger" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && <ViewerModal doc={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
