// Formatted, Slack-friendly text for sharing a lead / interview / assessment (copy-to-clipboard).
import { labelize, cameraLabel } from "@/lib/crm/constants";
import { formatCrmDate, formatCrmDatetime } from "@/lib/utils";

// Structural param types — the joined shapes these formatters actually read (grids pass supersets).
type ShareInterview = {
  round: string | null; status: string; outcome: string | null; company?: string | null;
  job_title?: string | null; received_date?: string | null; interview_at?: string | null;
  created_at?: string; updated_at?: string; job_post_url?: string | null;
};
type ShareAssessment = {
  status: string; company?: string | null; job_title?: string | null; priority?: string | null;
  duration?: string | null; entry_date?: string | null; deadline?: string | null;
  created_at?: string; updated_at?: string; budget?: string | null; job_post_url?: string | null;
  camera?: string | null; category?: { name?: string | null } | null;
};
type ShareLead = {
  company: string; role?: string | null; status: string; budget?: string | null;
  expected_budget?: string | null; shift?: string | null;
  profile?: { name?: string | null; stack?: { name?: string | null } | null } | null;
  owner?: { full_name?: string | null } | null;
  interviews?: ShareInterview[]; assessments?: ShareAssessment[];
};

const line = (label: string, val: unknown) => (val ? `${label}: ${val}` : null);
const ROUND_RANK = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "final"];

export function leadShareText(l: ShareLead): string {
  const interviews = [...(l.interviews ?? [])].sort(
    (a, b) => ROUND_RANK.indexOf(a.round ?? "") - ROUND_RANK.indexOf(b.round ?? "")
  );
  const ivLines = interviews.map((iv) => {
    const state = labelize(iv.outcome || iv.status);
    const bits = [
      iv.received_date ? `received ${formatCrmDate(iv.received_date)}` : null,
      // a scheduled interview's date/time matters most; show it whenever set
      iv.interview_at ? `${iv.status === "scheduled" ? "scheduled " : ""}${formatCrmDatetime(iv.interview_at)}` : null,
    ].filter(Boolean).join(" · ");
    return `  • ${iv.round ?? "—"} — ${state}${bits ? ` · ${bits}` : ""}`;
  });
  const asLines = (l.assessments ?? []).map((as) => {
    const bits = [
      as.category?.name ?? null,
      as.camera ? cameraLabel(as.camera) : null,
      as.entry_date ? `received ${formatCrmDate(as.entry_date)}` : null,
      as.deadline ? `deadline ${formatCrmDate(as.deadline)}` : null,
    ].filter(Boolean).join(" · ");
    return `  • ${labelize(as.status)}${bits ? ` · ${bits}` : ""}`;
  });

  return [
    `Lead: ${l.company}${l.role ? ` — ${l.role}` : ""}`,
    line("Status", labelize(l.status)),
    line("Profile", l.profile?.name),
    line("Stack", l.profile?.stack?.name),
    line("BD", l.owner?.full_name),
    line("Budget", l.budget),
    line("Expected budget", l.expected_budget),
    line("Shift", l.shift),
    `Interviews (${interviews.length}):`,
    ...(ivLines.length ? ivLines : ["  • none yet"]),
    `Assessments (${(l.assessments ?? []).length}):`,
    ...(asLines.length ? asLines : ["  • none yet"]),
  ].filter(Boolean).join("\n");
}

export function interviewShareText(iv: ShareInterview): string {
  return [
    `Interview — ${iv.company ?? "—"}`,
    line("Job", iv.job_title),
    line("Round", iv.round),
    line("Status", labelize(iv.status)),
    line("Outcome", iv.outcome ? labelize(iv.outcome) : null),
    line("Received", iv.received_date ? formatCrmDate(iv.received_date) : null),
    line("Interview at", iv.interview_at ? formatCrmDatetime(iv.interview_at) : null),
    line("Entry", iv.created_at ? formatCrmDate(iv.created_at) : null),
    line("Modified", iv.updated_at ? formatCrmDate(iv.updated_at) : null),
    line("Job post", iv.job_post_url),
  ].filter(Boolean).join("\n");
}

export function assessmentShareText(as: ShareAssessment): string {
  return [
    `Assessment — ${as.company ?? "—"}`,
    line("Job", as.job_title),
    line("Status", labelize(as.status)),
    line("Category", as.category?.name),
    line("Camera", as.camera ? cameraLabel(as.camera) : null),
    line("Priority", as.priority),
    line("Duration", as.duration),
    line("Received", as.entry_date ? formatCrmDate(as.entry_date) : null),
    line("Deadline", as.deadline ? formatCrmDate(as.deadline) : null),
    line("Entry", as.created_at ? formatCrmDate(as.created_at) : null),
    line("Modified", as.updated_at ? formatCrmDate(as.updated_at) : null),
    line("Budget", as.budget),
    line("Job post", as.job_post_url),
  ].filter(Boolean).join("\n");
}
