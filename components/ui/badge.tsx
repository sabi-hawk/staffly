import * as React from "react";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info" | "brand";

const tones: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-gray-100 text-text-secondary",
  info: "bg-blue-50 text-blue-600",
  brand: "bg-brand-light text-brand-primary",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium",
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
        <Badge tone="neutral" className="ring-1 ring-border bg-transparent">
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
