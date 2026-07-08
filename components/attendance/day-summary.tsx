"use client";
// Read-only view of a day's full summary: an eye icon (shown only when there IS a summary) that opens a
// mini modal with the BD job applications (profile → count, + total) and the Notes. Used in the
// Recent-days / attendance-history "Task summary" column so the whole summary is visible, not just text.
import { useState } from "react";
import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const PROSE = "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-primary [&_a]:underline [&_p]:mb-1";
const strip = (html: string | null | undefined) => (html ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();

export type JobLine = { label: string; count: number };

export function DaySummary({ workDate, notesHtml, jobs = [] }: { workDate: string; notesHtml: string | null; jobs?: JobLine[] }) {
  const [open, setOpen] = useState(false);
  const hasNotes = !!strip(notesHtml);
  const total = jobs.reduce((s, j) => s + (Number(j.count) || 0), 0);
  const hasContent = hasNotes || total > 0;
  if (!hasContent) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="View summary"
        aria-label="View summary"
        className="inline-flex size-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface hover:text-text-primary"
      >
        <Eye className="size-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Summary · {workDate}</DialogTitle>
          <DialogDescription>What was done on this day.</DialogDescription>
          <div className="mt-4 space-y-4">
            {total > 0 && (
              <div>
                <div className="mb-2 text-sm font-medium text-text-primary">Job applications</div>
                <div className="overflow-hidden rounded-md border border-border">
                  {jobs.filter((j) => (Number(j.count) || 0) > 0).map((j) => (
                    <div key={j.label} className="flex items-center justify-between border-b border-border px-3 py-1.5 text-sm last:border-b-0">
                      <span className="text-text-secondary">{j.label}</span>
                      <span className="tabular font-medium text-text-primary">{j.count}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-surface/60 px-3 py-1.5 text-sm">
                    <span className="font-medium text-text-primary">Total</span>
                    <span className="tabular font-semibold text-text-primary">{total}</span>
                  </div>
                </div>
              </div>
            )}
            {hasNotes && (
              <div>
                <div className="mb-2 text-sm font-medium text-text-primary">Notes</div>
                <div className={`rounded-md border border-border p-3 text-sm text-text-primary ${PROSE}`} dangerouslySetInnerHTML={{ __html: notesHtml as string }} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
