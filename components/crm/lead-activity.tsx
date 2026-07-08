"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, ReasonDialog } from "@/components/ui/dialog";
import { labelize, statusTone } from "@/lib/crm/constants";
import { formatCrmDatetime as fmt } from "@/lib/utils";
import type { Interview, Assessment } from "@/lib/types";
import type { Opt } from "@/lib/crm/options";
import { InterviewForm } from "./interview-form";
import { AssessmentForm } from "./assessment-form";

export function LeadActivity({
  leadId,
  devProfileId,
  company,
  developers,
  interviews,
  assessments,
  canManage = false,
  initialEdit,
}: {
  leadId: string;
  devProfileId: string | null;
  company: string | null;
  developers: Opt[];
  interviews: Interview[];
  assessments: Assessment[];
  canManage?: boolean; // super admin: may restore + hard-delete. Others: dismiss only.
  initialEdit?: { kind: "interviews" | "assessments"; id: string } | null;
}) {
  const router = useRouter();
  // Open the record's edit form when deep-linked from the grid (?edit=kind:id).
  const [iEdit, setIEdit] = useState<string | null>(initialEdit?.kind === "interviews" ? initialEdit.id : null);
  const [aEdit, setAEdit] = useState<string | null>(initialEdit?.kind === "assessments" ? initialEdit.id : null);

  useEffect(() => {
    if (!initialEdit) return;
    const el = document.getElementById(`edit-${initialEdit.kind}-${initialEdit.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [initialEdit]);
  const devName = (id: string | null) => developers.find((d) => d.id === id)?.label ?? "—";
  // Same-developer-across-rounds (FRD-02): a new round defaults to round 1's (or the earliest) developer.
  const firstDeveloper =
    interviews.find((i) => i.round === "1st")?.given_by ?? interviews[0]?.given_by ?? null;

  const [pendingDelete, setPendingDelete] = useState<{ kind: "interviews" | "assessments"; id: string } | null>(null);
  const [pendingDismiss, setPendingDismiss] = useState<{ kind: "interviews" | "assessments"; id: string } | null>(null);

  async function del(kind: "interviews" | "assessments", id: string) {
    const res = await fetch(`/api/crm/${kind}/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); router.refresh(); } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      toast.error(error ?? "Failed");
    }
  }
  async function patch(kind: "interviews" | "assessments", id: string, body: unknown, ok: string) {
    const res = await fetch(`/api/crm/${kind}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { toast.success(ok); router.refresh(); } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      toast.error(error ?? "Failed");
    }
  }

  // Dismiss (anyone, own record) vs Restore + Delete (super admin only). A dismissed record is crossed out.
  function rowActions(kind: "interviews" | "assessments", id: string, dismissed: boolean, editing: boolean, onEdit: () => void) {
    return (
      <span className="flex shrink-0 gap-1">
        <Button variant="outline" size="sm" onClick={onEdit} title={editing ? "Close" : "Edit"}><Pencil className="size-4" /></Button>
        {!dismissed && (
          <Button variant="outline" size="sm" onClick={() => setPendingDismiss({ kind, id })} title="Dismiss (cross out)"><EyeOff className="size-4" /></Button>
        )}
        {dismissed && canManage && (
          <Button variant="outline" size="sm" onClick={() => patch(kind, id, { _restore: true }, "Restored")} title="Restore"><RotateCcw className="size-4" /></Button>
        )}
        {dismissed && !canManage && (
          <span className="rounded-md border border-border px-1.5 text-[11px] leading-7 text-text-secondary" title="A super admin can restore or delete this">Dismissed</span>
        )}
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setPendingDelete({ kind, id })} title="Delete permanently"><Trash2 className="size-4" /></Button>
        )}
      </span>
    );
  }

  return (
    <div className="space-y-8">
      {/* Interviews */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-semibold">Interviews ({interviews.length})</h3>
          <Button size="sm" variant="outline" onClick={() => setIEdit(iEdit === "new" ? null : "new")}>
            <Plus className="size-4" /> Add interview
          </Button>
        </div>
        {iEdit === "new" && (
          <div className="rounded-md border border-border p-3">
            <InterviewForm leadId={leadId} devProfileId={devProfileId} company={company} developers={developers} defaultDeveloper={firstDeveloper} onDone={() => setIEdit(null)} />
          </div>
        )}
        <div className="space-y-2">
          {interviews.map((iv) => (
            <div key={iv.id} id={`edit-interviews-${iv.id}`} className={`rounded-md border border-border p-3 ${iv.dismissed_at ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className={`flex flex-wrap items-center gap-2 text-sm ${iv.dismissed_at ? "line-through" : ""}`}>
                  <span className="font-medium">{iv.job_title || iv.company || "Interview"}</span>
                  {iv.round && <Badge tone="neutral">{iv.round}</Badge>}
                  <Badge tone={statusTone(iv.status)}>{labelize(iv.status)}</Badge>
                  {iv.outcome && <Badge tone={statusTone(iv.outcome)}>{labelize(iv.outcome)}</Badge>}
                  <span className="text-text-secondary">· given {devName(iv.given_by)}{iv.whom_should_give ? ` → next ${devName(iv.whom_should_give)}` : ""} · {fmt(iv.interview_at)}</span>
                </div>
                {rowActions("interviews", iv.id, !!iv.dismissed_at, iEdit === iv.id, () => setIEdit(iEdit === iv.id ? null : iv.id))}
              </div>
              {iEdit === iv.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <InterviewForm id={iv.id} developers={developers} initial={iv as never} onDone={() => setIEdit(null)} />
                </div>
              )}
            </div>
          ))}
          {interviews.length === 0 && <p className="text-caption text-text-secondary">No interviews yet.</p>}
        </div>
      </section>

      {/* Assessments — divider separates them clearly from interviews (owner feedback) */}
      <section className="space-y-3 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-semibold">Assessments ({assessments.length})</h3>
          <Button size="sm" variant="outline" onClick={() => setAEdit(aEdit === "new" ? null : "new")}>
            <Plus className="size-4" /> Add assessment
          </Button>
        </div>
        {aEdit === "new" && (
          <div className="rounded-md border border-border p-3">
            <AssessmentForm leadId={leadId} devProfileId={devProfileId} company={company} developers={developers} onDone={() => setAEdit(null)} />
          </div>
        )}
        <div className="space-y-2">
          {assessments.map((as) => (
            <div key={as.id} id={`edit-assessments-${as.id}`} className={`rounded-md border border-border p-3 ${as.dismissed_at ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className={`flex flex-wrap items-center gap-2 text-sm ${as.dismissed_at ? "line-through" : ""}`}>
                  <span className="font-medium">{as.job_title || as.company || "Assessment"}</span>
                  <Badge tone={statusTone(as.status)}>{labelize(as.status)}</Badge>
                  {as.priority && <Badge tone={as.priority === "high" ? "danger" : "neutral"}>{as.priority}</Badge>}
                  {as.duration && <Badge tone="neutral">{as.duration}</Badge>}
                  <span className="text-text-secondary">· deadline {as.deadline ?? "—"} · {devName(as.completed_by)}</span>
                </div>
                {rowActions("assessments", as.id, !!as.dismissed_at, aEdit === as.id, () => setAEdit(aEdit === as.id ? null : as.id))}
              </div>
              {aEdit === as.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <AssessmentForm id={as.id} developers={developers} initial={as as never} onDone={() => setAEdit(null)} />
                </div>
              )}
            </div>
          ))}
          {assessments.length === 0 && <p className="text-caption text-text-secondary">No assessments yet.</p>}
        </div>
      </section>

      <ReasonDialog
        open={!!pendingDismiss}
        onOpenChange={(o) => { if (!o) setPendingDismiss(null); }}
        title="Dismiss this record?"
        description="It stays for the record but is crossed out. A super admin can restore or delete it."
        label="Reason (optional)"
        placeholder="Why is this being dismissed?"
        required={false}
        submitLabel="Dismiss"
        onSubmit={(reason) => patch(pendingDismiss!.kind, pendingDismiss!.id, { _dismiss: true, reason }, "Dismissed")}
      />
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        title="Delete this record?"
        description="This permanently removes the record and cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => del(pendingDelete!.kind, pendingDelete!.id)}
      />
    </div>
  );
}
