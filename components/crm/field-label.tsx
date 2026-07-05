"use client";
// A field <Label> paired with an optional <InfoHint> (info icon + tooltip). Keeps CRM forms concise
// while giving every field a self-explanatory hint for new BDs.
import { Label } from "@/components/ui/input";
import { InfoHint } from "./info-hint";

export function FieldLabel({ htmlFor, hint, children }: { htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor}>{children}</Label>
      {hint && <InfoHint text={hint} label={typeof children === "string" ? children : undefined} />}
    </div>
  );
}
