"use client";
// Edit a lead in a modal (triggered by the pencil on the lead's top card) instead of a repetitive
// inline form. Wraps the shared LeadForm; closes + refreshes on save.
import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { LeadForm } from "@/components/crm/lead-form";
import type { Opt } from "@/lib/crm/options";

export function LeadEditModal({
  id,
  profiles,
  owners,
  canAssignOwner,
  initial,
}: {
  id: string;
  profiles: Opt[];
  owners: Opt[];
  canAssignOwner: boolean;
  initial: Partial<Record<string, string | null>>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-caption text-text-secondary hover:bg-surface"
        aria-label="Edit lead"
        title="Edit lead"
      >
        <Pencil className="size-3.5" /> Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-soft" role="dialog" aria-modal="true" aria-label="Edit lead">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-h3 font-semibold text-text-primary">Edit lead</h2>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-text-secondary hover:bg-surface" aria-label="Close"><X className="size-4" /></button>
            </div>
            <LeadForm
              id={id}
              profiles={profiles}
              owners={owners}
              canAssignOwner={canAssignOwner}
              initial={initial}
              onDone={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
