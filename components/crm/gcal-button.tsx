"use client";
// One-click "Add to Google Calendar" for a scheduled interview. Fetches a prefilled Google Calendar
// event URL from the server (title, Pakistan-time slot, the assigned developer as a guest, meeting link,
// and the lead's documents as links) and opens it in a new tab — the user reviews and hits Save.
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";

export function GoogleCalendarButton({ interviewId, variant = "icon", className }: { interviewId: string; variant?: "icon" | "link"; className?: string }) {
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const res = await fetch(`/api/crm/interviews/${interviewId}/gcal`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) throw new Error(j.error ?? "Could not build the event");
      window.open(j.url, "_blank", "noopener,noreferrer");
      if (!j.guest) toast.message("Opened Google Calendar. No developer email on file, so no guest was added.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (variant === "link") {
    return (
      <button onClick={open} disabled={busy} className={className ?? "inline-flex items-center gap-1 text-caption font-medium text-brand-primary hover:underline"}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarPlus className="size-3.5" />} Add to Google Calendar
      </button>
    );
  }
  return (
    <button onClick={open} disabled={busy} title="Add to Google Calendar" aria-label="Add to Google Calendar" className={className ?? "inline-flex size-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface hover:text-brand-primary"}>
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarPlus className="size-3.5" />}
    </button>
  );
}
