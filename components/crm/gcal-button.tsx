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
      // POST decides: if the API is on AND this BD has connected Google, it creates the event with the
      // documents ATTACHED (returns htmlLink); otherwise it returns the one-click URL to open.
      const res = await fetch(`/api/crm/interviews/${interviewId}/gcal`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Could not create the event");

      if (j.api && j.htmlLink) {
        window.open(j.htmlLink, "_blank", "noopener,noreferrer");
        toast.success(j.attached ? `Event created with ${j.attached} file${j.attached === 1 ? "" : "s"} attached` : "Event created in Google Calendar");
        return;
      }
      // One-click fallback (not connected / API off).
      if (j.url) {
        window.open(j.url, "_blank", "noopener,noreferrer");
        if (j.needsConnect) toast.message("Opened Google Calendar (docs as links). Connect Google on your profile to attach the files automatically.");
        else if (!j.guest) toast.message("Opened Google Calendar. No developer email on file, so no guest was added.");
      }
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
