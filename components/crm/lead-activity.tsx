"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
}: {
  leadId: string;
  devProfileId: string | null;
  company: string | null;
  developers: Opt[];
  interviews: Interview[];
  assessments: Assessment[];
}) {
  const router = useRouter();
  const [iEdit, setIEdit] = useState<string | null>(null); // interview id or "new"
  const [aEdit, setAEdit] = useState<string | null>(null); // assessment id or "new"
  const devName = (id: string | null) => developers.find((d) => d.id === id)?.label ?? "—";
  // Same-developer-across-rounds (FRD-02): a new round defaults to round 1's (or the earliest) developer.
  const firstDeveloper =
    interviews.find((i) => i.round === "1st")?.given_by ?? interviews[0]?.given_by ?? null;

  async function del(kind: "interviews" | "assessments", id: string) {
    if (!confirm("Delete this record?")) return;
    const res = await fetch(`/api/crm/${kind}/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); router.refresh(); } else toast.error("Failed");
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
            <div key={iv.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{iv.job_title || iv.company || "Interview"}</span>
                  {iv.round && <Badge tone="neutral">{iv.round}</Badge>}
                  <Badge tone={statusTone(iv.status)}>{labelize(iv.status)}</Badge>
                  {iv.outcome && <Badge tone={statusTone(iv.outcome)}>{labelize(iv.outcome)}</Badge>}
                  <span className="text-text-secondary">· given {devName(iv.given_by)}{iv.whom_should_give ? ` → next ${devName(iv.whom_should_give)}` : ""} · {fmt(iv.interview_at)}</span>
                </div>
                <span className="flex shrink-0 gap-1">
                  <Button variant="outline" size="sm" onClick={() => setIEdit(iEdit === iv.id ? null : iv.id)}><Pencil className="size-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => del("interviews", iv.id)}><Trash2 className="size-4" /></Button>
                </span>
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
            <div key={as.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{as.job_title || as.company || "Assessment"}</span>
                  <Badge tone={statusTone(as.status)}>{labelize(as.status)}</Badge>
                  {as.priority && <Badge tone={as.priority === "high" ? "danger" : "neutral"}>{as.priority}</Badge>}
                  {as.duration && <Badge tone="neutral">{as.duration}</Badge>}
                  <span className="text-text-secondary">· deadline {as.deadline ?? "—"} · {devName(as.completed_by)}</span>
                </div>
                <span className="flex shrink-0 gap-1">
                  <Button variant="outline" size="sm" onClick={() => setAEdit(aEdit === as.id ? null : as.id)}><Pencil className="size-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => del("assessments", as.id)}><Trash2 className="size-4" /></Button>
                </span>
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
    </div>
  );
}
