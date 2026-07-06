import * as React from "react";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info" | "brand";

const tones: Record<Tone, string> = {
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
  neutral: "border-border bg-gray-50 text-text-secondary",
  info: "border-blue-200 bg-blue-50 text-blue-600",
  brand: "border-brand-primary/30 bg-brand-light text-brand-primary",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        // sleek convention (owner, 2026-07-07): subtle rounding, coloured border + translucent fill,
        // Capitalised label (CSS capitalize fixes lowercase statuses like "approved" everywhere)
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-caption font-medium capitalize",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Attendance status pill per §3.3. */
export function StatusBadge({
  status,
  deficit,
}: {
  status: "working" | "done" | "late" | "awaiting" | "on_leave" | "deficit" | "absent";
  deficit?: number;
}) {
  switch (status) {
    case "working":
      return (
        <Badge tone="success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" /> Working
        </Badge>
      );
    case "done":
      return <Badge tone="neutral">Done</Badge>;
    case "late":
      return <Badge tone="warning">Late</Badge>;
    case "awaiting":
      return (
        <Badge tone="neutral" className="bg-transparent">
          Awaiting
        </Badge>
      );
    case "on_leave":
      return <Badge tone="info">On leave</Badge>;
    case "absent":
      return <Badge tone="danger">Absent</Badge>;
    case "deficit":
      return <Badge tone="danger">Short by {formatHours(deficit)}</Badge>;
  }
}
