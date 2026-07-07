"use client";
// The app's reusable rich-text note-taker section. View shows the sanitized HTML; Edit reveals the
// editor inline and PATCHes just this one field on the given endpoint. Stored HTML is sanitized at
// the write path (lib/sanitize). Use anywhere a free-text notes area is wanted (leads, deals, …).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/crm/rich-text";
import { InfoHint } from "@/components/crm/info-hint";

const PROSE = "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-primary [&_a]:underline [&_p]:mb-1";

export function RichNoteSection({
  endpoint,
  field,
  title,
  description,
  hint,
  valueHtml,
  placeholder,
  canEdit = true,
}: {
  endpoint: string; // PATCH url, e.g. /api/crm/deals/<id>
  field: string; // the field name to send, e.g. "notes"
  title: string;
  description?: string;
  hint?: string;
  valueHtml: string | null;
  placeholder?: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [html, setHtml] = useState(valueHtml ?? "");

  async function save() {
    setBusy(true);
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: html }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to save");
    toast.success("Saved");
    setEditing(false);
    router.refresh();
  }

  const isEmpty = !(valueHtml ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-1.5">{title}{hint && <InfoHint text={hint} label={title} />}</CardTitle>
          {description && <p className="mt-1 text-caption text-text-secondary">{description}</p>}
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => { setHtml(valueHtml ?? ""); setEditing((e) => !e); }}>
            {editing ? <><X className="size-3.5" /> Cancel</> : <><Pencil className="size-3.5" /> Edit</>}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <RichText value={html} onChange={setHtml} placeholder={placeholder} />
            <Button size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </div>
        ) : isEmpty ? (
          <p className="text-sm text-text-secondary">{canEdit ? "Nothing yet. Click Edit to add notes." : "No notes."}</p>
        ) : (
          <div className={`text-sm text-text-primary ${PROSE}`} dangerouslySetInnerHTML={{ __html: valueHtml ?? "" }} />
        )}
      </CardContent>
    </Card>
  );
}
