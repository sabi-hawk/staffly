"use client";
// Read-only view of a day's full summary: an eye icon (shown only when there IS a summary) that opens a
// mini modal with the BD job applications (profile → count, + total) and the Notes. Used in the
// Recent-days / attendance-history "Task summary" column so the whole summary is visible, not just text.
import { useState } from "react";
import { Eye, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { summaryShareText } from "@/lib/summary-share";

const PROSE = "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-primary [&_a]:underline [&_p]:mb-1";
const strip = (html: string | null | undefined) => (html ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();

export type JobLine = { label: string; count: number };

export function DaySummary({ workDate, notesHtml, jobs = [], hunted = 0 }: { workDate: string; notesHtml: string | null; jobs?: JobLine[]; hunted?: number }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasNotes = !!strip(notesHtml);
  const total = jobs.reduce((s, j) => s + (Number(j.count) || 0), 0);
  const hasContent = hasNotes || total > 0 || hunted > 0;
  if (!hasContent) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(summaryShareText({ date: workDate, lines: jobs, hunted, notes: notesHtml }));
      setCopied(true); toast.success("Summary copied");
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Copy failed"); }
  }

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
            {/* Jobs hunted — always shown for a BD summary, even when 0. */}
            {(total > 0 || hunted > 0) && (
              <div className="flex items-center justify-between rounded-md border border-border bg-surface/60 px-3 py-2 text-sm">
                <span className="font-medium text-text-primary">Jobs hunted (board)</span>
                <span className="tabular font-semibold text-text-primary">{hunted}</span>
              </div>
            )}
            <div>
              <div className="mb-2 text-sm font-medium text-text-primary">Notes <span className="font-normal text-text-secondary">(optional)</span></div>
              {hasNotes
                ? <div className={`rounded-md border border-border p-3 text-sm text-text-primary ${PROSE}`} dangerouslySetInnerHTML={{ __html: notesHtml as string }} />
                : <div className="rounded-md border border-dashed border-border p-3 text-sm text-text-secondary/70">No notes.</div>}
            </div>
          </div>
          {/* Copy at the bottom-right so it never collides with the dialog's close (X). */}
          <div className="mt-4 flex justify-end border-t border-border pt-3">
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-caption font-medium text-text-secondary hover:bg-surface hover:text-brand-primary">
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />} Copy for Slack
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
