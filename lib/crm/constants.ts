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
// Common semantic round names (a typical hiring pipeline). The field is free text — these are just
// suggestions in a datalist; a BD can type a new one.
export const INTERVIEW_ROUND_NAMES = [
  "Initial call", "Technical round 1", "Technical round 2", "Technical round 3",
  "Architectural round", "Cultural round", "Final round",
] as const;
export const INTERVIEW_OUTCOME = ["pending", "selected", "rejected", "on_hold"] as const;

export const ASSESSMENT_STATUS = ["pending", "in_progress", "completed", "expired", "cancelled"] as const;

// Assessment camera setting (0069) — optional; null/"" = not determined (the default, since we usually
// don't know up front). Category is a configurable list (assessment_categories), not a fixed enum.
export const CAMERA_OPTIONS = [
  { value: "with", label: "With camera" },
  { value: "without", label: "Without camera" },
] as const;
export const cameraLabel = (v: string | null | undefined) =>
  v === "with" ? "With camera" : v === "without" ? "Without camera" : "Not determined";

// Deal engagement + how the Amount is billed (0066). A full-time hire can still be billed hourly.
export const ENGAGEMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "hourly", label: "Hourly" },
] as const;
export const RATE_TYPES = [
  { value: "monthly", label: "Per month" },
  { value: "hourly", label: "Per hour" },
] as const;
export const engagementLabel = (v: string | null | undefined) =>
  ENGAGEMENT_TYPES.find((e) => e.value === v)?.label ?? labelize(v);
/** Short suffix for an amount given its rate_type ("/ mo" | "/ hr"). */
export const rateSuffix = (rate: string | null | undefined) => (rate === "hourly" ? " / hr" : " / mo");
export const PRIORITIES = ["high", "medium", "low"] as const;
export const DURATIONS = ["15m", "30m", "45m", "1h", "1.5h", "2h", "2h+"] as const;
// Interview durations in MINUTES — used to compute the calendar event's end time (start + duration).
export const INTERVIEW_DURATIONS = [15, 20, 30, 45, 60, 90, 120, 180] as const;
export const durationMinLabel = (m: number) => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return `${h} hour${h > 1 ? "s" : ""}${r ? ` ${r} min` : ""}`;
};

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
