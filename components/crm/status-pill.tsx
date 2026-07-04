// A clean status pill: a tone-coloured dot + title-cased label. Shared across leads/profiles/activity.
// Pure module (no "use client") — usable in server and client components.
import { cn } from "@/lib/utils";
import { labelize, statusTone } from "@/lib/crm/constants";

const DOT: Record<string, string> = {
  success: "bg-success", warning: "bg-warning", danger: "bg-danger",
  brand: "bg-brand-primary", neutral: "bg-text-secondary", info: "bg-blue-500",
};

export function StatusPill({ status, className }: { status: string | null | undefined; className?: string }) {
  const tone = statusTone(status);
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-caption font-medium text-text-primary", className)}>
      <span className={cn("size-1.5 rounded-full", DOT[tone] ?? DOT.neutral)} />
      {labelize(status)}
    </span>
  );
}
