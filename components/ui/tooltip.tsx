"use client";
// Instant, CSS-only tooltip. The native `title` attribute waits ~1s before showing; this appears the
// moment you hover (no delay). Wrap any trigger; keep an aria-label on the trigger for accessibility.
import * as React from "react";
import { cn } from "@/lib/utils";

export function Tip({ label, children, side = "top", className }: { label: string; children: React.ReactNode; side?: "top" | "bottom"; className?: string }) {
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-text-primary px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-soft transition-opacity duration-75 group-hover/tip:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
        )}
      >
        {label}
      </span>
    </span>
  );
}
