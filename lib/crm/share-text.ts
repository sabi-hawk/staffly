// Formatted, Slack-friendly text for sharing a lead / interview / assessment (copy-to-clipboard).
import { labelize } from "@/lib/crm/constants";
import { formatCrmDate, formatCrmDatetime } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const line = (label: string, val: unknown) => (val ? `${label}: ${val}` : null);
const ROUND_RANK = ["1st", "2nd", "3rd", "4th", "5th"];

export function leadShareText(l: any): string {
  const interviews = [...(l.interviews ?? [])].sort(
    (a: any, b: any) => ROUND_RANK.indexOf(a.round) - ROUND_RANK.indexOf(b.round)
  );
  const ivLines = interviews.map((iv: any) => {
    const state = labelize(iv.outcome || iv.status);
    const bits = [
      iv.received_date ? `received ${formatCrmDate(iv.received_date)}` : null,
      // a scheduled interview's date/time matters most; show it whenever set
      iv.interview_at ? `${iv.status === "scheduled" ? "scheduled " : ""}${formatCrmDatetime(iv.interview_at)}` : null,
    ].filter(Boolean).join(" · ");
    return `  • ${iv.round ?? "—"} — ${state}${bits ? ` · ${bits}` : ""}`;
  });
  const asLines = (l.assessments ?? []).map((as: any) => {
    const bits = [
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

export function interviewShareText(iv: any): string {
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

export function assessmentShareText(as: any): string {
  return [
    `Assessment — ${as.company ?? "—"}`,
    line("Job", as.job_title),
    line("Status", labelize(as.status)),
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
