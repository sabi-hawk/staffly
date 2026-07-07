"use client";
// Small info icon with a hover/focus tooltip. Used platform-wide next to field labels.
// The glyph is a FILLED info circle (solid disc, knocked-out "i") so it reads as an icon,
// not a plain letter (owner, 2026-07-07).

export function InfoHint({ text, label }: { text: string; label?: string }) {
  return (
    <span className="group/hint relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label ? `${label}: ${text}` : text}
        className="text-text-secondary/50 transition-colors hover:text-brand-primary focus:text-brand-primary focus:outline-none"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <circle cx="8" cy="4.9" r="1.05" fill="white" />
          <rect x="7.1" y="7" width="1.8" height="5" rx="0.9" fill="white" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-56 -translate-x-1/2 rounded-md bg-text-primary px-2.5 py-1.5 text-caption font-normal leading-snug text-white shadow-card group-hover/hint:block group-focus-within/hint:block"
      >
        {text}
      </span>
    </span>
  );
}
