// CRM option lists + label helpers — plain module, safe on server AND client.

export const LEAD_STATUS = ["open", "interviewing", "assessment", "won", "lost", "disqualified"] as const;
export const DISQUALIFY_CATEGORIES = [
  { value: "fake_job", label: "Fake job" },
  { value: "low_pay", label: "Low pay" },
  { value: "unpaid_collab", label: "Unpaid collaboration" },
  { value: "other", label: "Other" },
] as const;

export const INTERVIEW_STATUS = ["pending", "scheduled", "completed", "cancelled"] as const;
export const INTERVIEW_ROUND = ["1st", "2nd", "3rd", "final"] as const;
export const INTERVIEW_OUTCOME = ["pending", "selected", "rejected", "on_hold"] as const;

export const ASSESSMENT_STATUS = ["pending", "in_progress", "completed", "cancelled"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;
export const DURATIONS = ["15m", "30m", "45m", "1h", "1.5h", "2h", "2h+"] as const;

/** Title-case a snake/underscore value for display ("on_hold" → "On hold"). */
export function labelize(v: string | null | undefined): string {
  if (!v) return "—";
  const s = v.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Badge tone for a status-ish value (maps to the shadcn Badge tones used elsewhere). */
export function statusTone(v: string | null | undefined): "success" | "warning" | "danger" | "neutral" | "brand" {
  switch (v) {
    case "won":
    case "selected":
    case "completed":
    case "active":
      return "success";
    case "ended":
      return "warning";
    case "rejected":
    case "lost":
    case "cancelled":
    case "disqualified":
      return "danger";
    case "pending":
    case "on_hold":
    case "scheduled":
      return "warning";
    case "interviewing":
    case "assessment":
    case "in_progress":
      return "brand";
    default:
      return "neutral";
  }
}
