// A sleek status chip: tone-tinted background + a small dot + title-cased label. Less rounded and
// lighter than a bordered pill (owner feedback: modern, not bulky). Shared across leads/profiles/activity.
// Pure module (no "use client") — usable in server and client components.
import { cn } from "@/lib/utils";
import { labelize, statusTone } from "@/lib/crm/constants";

const TONE: Record<string, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  brand: "bg-brand-light text-brand-primary",
  neutral: "bg-gray-100 text-text-secondary",
  info: "bg-blue-50 text-blue-600",
};
const DOT: Record<string, string> = {
  success: "bg-success", warning: "bg-warning", danger: "bg-danger",
  brand: "bg-brand-primary", neutral: "bg-text-secondary", info: "bg-blue-500",
};

export function StatusPill({ status, className }: { status: string | null | undefined; className?: string }) {
  const tone = statusTone(status);
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium leading-5", TONE[tone] ?? TONE.neutral, className)}>
      <span className={cn("size-1 rounded-full", DOT[tone] ?? DOT.neutral)} />
      {labelize(status)}
    </span>
  );
}
