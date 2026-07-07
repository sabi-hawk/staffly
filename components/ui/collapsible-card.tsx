"use client";
// A Card whose body collapses/expands from its header. Header shows a title + optional description
// and an optional action (e.g. a range filter) that does NOT toggle. Used on the employee detail
// page to keep long sections (flags, attendance, shift, compensation) tidy.
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CollapsibleCard({
  title,
  description,
  action,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 p-5">
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <div className="text-h3 font-semibold text-text-primary">{title}</div>
          {description && <p className="mt-1 text-caption text-text-secondary">{description}</p>}
        </button>
        <div className="flex shrink-0 items-center gap-3">
          {action}
          <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Collapse" : "Expand"} className="rounded-md p-1 text-text-secondary hover:bg-surface hover:text-text-primary">
            <ChevronDown className={cn("size-5 transition-transform", open ? "" : "-rotate-90")} />
          </button>
        </div>
      </div>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
