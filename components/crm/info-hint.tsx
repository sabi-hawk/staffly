"use client";
// Small info icon with a hover/focus tooltip — explains a CRM field's purpose for new BDs.
// Pair it next to a field <Label>. Accessible: focusable, tooltip shown on hover AND keyboard focus.
import { Info } from "lucide-react";

export function InfoHint({ text, label }: { text: string; label?: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label ? `${label} — ${text}` : text}
        className="text-text-secondary/70 transition-colors hover:text-brand-primary focus:text-brand-primary focus:outline-none"
      >
        <Info className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-56 -translate-x-1/2 rounded-md bg-text-primary px-2.5 py-1.5 text-caption font-normal leading-snug text-white shadow-card group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
