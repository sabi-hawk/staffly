"use client";
// An editable rich-text section on the lead page (Job Description / BD Notes). Lives BELOW Documents
// (owner feedback — out of the edit modal). View shows the sanitized HTML; Edit reveals the editor
// inline and PATCHes just this one field. Stored HTML is sanitized at write-time (lib/sanitize).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/crm/rich-text";
import { InfoHint } from "@/components/crm/info-hint";

const PROSE = "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-primary [&_a]:underline [&_p]:mb-1";

export function LeadRichSection({
  leadId, field, title, description, hint, valueHtml, placeholder,
}: {
  leadId: string;
  field: "job_description" | "notes";
  title: string;
  description: string;
  hint: string;
  valueHtml: string | null;
  placeholder?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [html, setHtml] = useState(valueHtml ?? "");

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: html }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Failed to save");
    toast.success(`${title} saved`);
    setEditing(false);
    router.refresh();
  }

  const hasContent = !!(valueHtml && valueHtml.trim());

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-1.5">
          <CardTitle>{title}</CardTitle>
          <InfoHint text={hint} label={title} />
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} aria-label={`Edit ${title}`}>
            <Pencil className="size-3.5" /> {hasContent ? "Edit" : "Add"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-caption text-text-secondary">{description}</p>
        {editing ? (
          <>
            <RichText value={html} onChange={setHtml} placeholder={placeholder} />
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => { setHtml(valueHtml ?? ""); setEditing(false); }} disabled={busy}>Cancel</Button>
            </div>
          </>
        ) : hasContent ? (
          <div className={`text-sm text-text-primary ${PROSE}`} dangerouslySetInnerHTML={{ __html: valueHtml as string }} />
        ) : (
          <p className="text-sm text-text-secondary">Nothing yet — click <span className="font-medium">Add</span> to fill this in.</p>
        )}
      </CardContent>
    </Card>
  );
}
