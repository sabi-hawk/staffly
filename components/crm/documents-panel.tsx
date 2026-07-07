"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Eye, Star, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ReasonDialog } from "@/components/ui/dialog";
import { FileInput } from "@/components/ui/file-input";
import { FloatInput, FloatSelect } from "@/components/ui/field";
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
            {d.is_primary && (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-success" title="Primary resume">
                <Star className="size-3 fill-success" /> Primary
              </span>
            )}
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
  const [fileKey, setFileKey] = useState(0); // remount FileInput after a successful upload
  const [pendingSoftDelete, setPendingSoftDelete] = useState<string | null>(null);
  const [pendingHardDelete, setPendingHardDelete] = useState<string | null>(null);
  const [noteDoc, setNoteDoc] = useState<Doc | null>(null);

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
    setFileKey((k) => k + 1);
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
  const softDelete = (id: string) => act(id, { action: "delete" }, "Deleted");
  const saveNote = (id: string, next: string) => act(id, { action: "note", note: next || null }, "Note saved");

  // Admin-only HARD delete from history (removes the storage object too).
  async function hardDelete(id: string) {
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
        {resumes.map((d) => <DocRow key={d.id} d={d} canEdit={canEdit} onView={setViewing} onPrimary={setPrimary} onNote={setNoteDoc} onDelete={setPendingSoftDelete} />)}
      </div>
      <div className="space-y-2">
        <div className="text-caption font-medium text-text-secondary">Cover letters</div>
        {covers.length === 0 && <div className="text-caption text-text-secondary">No cover letters.</div>}
        {covers.map((d) => <DocRow key={d.id} d={d} canEdit={canEdit} onView={setViewing} onPrimary={setPrimary} onNote={setNoteDoc} onDelete={setPendingSoftDelete} />)}
      </div>

      {canEdit && (
        <form onSubmit={upload} className="space-y-3 rounded-lg border border-border bg-surface/40 p-4">
          <div className="text-sm font-semibold text-text-primary">Add a document</div>
          <FileInput
            key={fileKey}
            id="crm-doc-file"
            file={file}
            onChange={setFile}
            accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
            className="h-11"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <FloatSelect
              id="crm-doc-type"
              label="Type"
              hint="Resumes can be marked primary; the primary one is what gets attached by default."
              value={docType}
              onChange={(e) => setDocType(e.target.value as "resume" | "cover_letter")}
            >
              <option value="resume">Resume</option>
              <option value="cover_letter">Cover letter</option>
            </FloatSelect>
            <FloatInput
              id="crm-doc-label"
              label="Label"
              hint="A short name BDs recognise at a glance, e.g. Full Stack."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <FloatInput
              id="crm-doc-note"
              label="Note (optional)"
              hint="What this version is for, e.g. concise one-pager for quick applications."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            {docType === "resume" ? (
              <label className="flex items-center gap-1.5 text-sm text-text-primary">
                <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} /> Make this the primary resume
              </label>
            ) : <span />}
            <Button type="submit" size="sm" disabled={busy || !file}>
              {busy ? <><Loader2 className="size-4 animate-spin" /> Uploading…</> : "Upload"}
            </Button>
          </div>
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
                <Button variant="outline" size="sm" onClick={() => setPendingHardDelete(d.id)} aria-label="Permanently delete"><Trash2 className="size-4 text-danger" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && <ViewerModal doc={viewing} onClose={() => setViewing(null)} />}

      <ConfirmDialog
        open={!!pendingSoftDelete}
        onOpenChange={(o) => { if (!o) setPendingSoftDelete(null); }}
        title="Delete this document?"
        description="An admin can still recover it from history."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => softDelete(pendingSoftDelete!)}
      />
      <ConfirmDialog
        open={!!pendingHardDelete}
        onOpenChange={(o) => { if (!o) setPendingHardDelete(null); }}
        title="Permanently delete this document?"
        description="This removes the file and cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => hardDelete(pendingHardDelete!)}
      />
      <ReasonDialog
        open={!!noteDoc}
        onOpenChange={(o) => { if (!o) setNoteDoc(null); }}
        title="Document note"
        description="What this document is for."
        label="Note"
        initialValue={noteDoc?.note ?? ""}
        submitLabel="Save note"
        onSubmit={(v) => saveNote(noteDoc!.id, v)}
      />
    </div>
  );
}
