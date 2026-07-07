// CRM option lists + label helpers — plain module, safe on server AND client.

// Lead pipeline status (FRD-07) — the thread's overall outcome, distinct from per-activity state.
export const LEAD_STATUS = ["in_progress", "on_hold", "closed", "rejected", "dismissed"] as const;
// Display metadata: label + a lucide icon name (resolved in the UI). Closed = the positive/won state.
export const LEAD_STATUS_META = [
  { value: "in_progress", label: "In Progress", icon: "Loader" },
  { value: "on_hold", label: "On Hold", icon: "PauseCircle" },
  { value: "closed", label: "Closed", icon: "CheckCircle2" },
  { value: "rejected", label: "Rejected", icon: "XCircle" },
  { value: "dismissed", label: "Dismissed", icon: "Ban" },
] as const;
// Statuses that require a reason/feedback when set.
export const LEAD_REASON_STATUSES = ["rejected", "dismissed"] as const;

// Reason categories for a Dismissed lead (reuses the legacy disqualified_* columns for audit continuity).
export const DISQUALIFY_CATEGORIES = [
  { value: "fake_job", label: "Fake job" },
  { value: "low_pay", label: "Low pay" },
  { value: "unpaid_collab", label: "Unpaid collaboration" },
  { value: "other", label: "Other" },
] as const;

export const INTERVIEW_STATUS = ["pending", "scheduled", "completed", "cancelled"] as const;
export const INTERVIEW_ROUND = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "final"] as const;
/** Display label for a round value ("final" → "Final", others as-is). */
export const roundLabel = (r: string) => (r === "final" ? "Final" : r);
export const INTERVIEW_OUTCOME = ["pending", "selected", "rejected", "on_hold"] as const;

export const ASSESSMENT_STATUS = ["pending", "in_progress", "completed", "cancelled"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;
export const DURATIONS = ["15m", "30m", "45m", "1h", "1.5h", "2h", "2h+"] as const;

/** Title-case a snake/underscore value for display, every word ("on_hold" → "On Hold"). */
export function labelize(v: string | null | undefined): string {
  if (!v) return "—";
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Badge tone for a status-ish value (maps to the shadcn Badge tones used elsewhere). */
export function statusTone(v: string | null | undefined): "success" | "warning" | "danger" | "neutral" | "brand" {
  switch (v) {
    case "closed":
    case "selected":
    case "completed":
    case "active":
      return "success";
    case "ended":
      return "warning";
    case "rejected":
    case "cancelled":
    case "dismissed":
      return "danger";
    case "pending":
    case "on_hold":
    case "scheduled":
      return "warning";
    case "in_progress":
      return "brand";
    default:
      return "neutral";
  }
}
