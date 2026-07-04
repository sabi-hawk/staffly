// Formatted, Slack-friendly text for sharing a lead / interview / assessment (copy-to-clipboard).
import { labelize } from "@/lib/crm/constants";
import { formatCrmDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const line = (label: string, val: unknown) => (val ? `${label}: ${val}` : null);

export function leadShareText(l: any): string {
  return [
    `Lead: ${l.company}${l.role ? ` — ${l.role}` : ""}`,
    line("Status", labelize(l.status)),
    line("Profile", l.profile?.name),
    line("Stack", l.profile?.stack?.name),
    line("BD", l.owner?.full_name),
    line("Budget", l.budget),
    line("Expected budget", l.expected_budget),
    `Interviews: ${l.interviews?.length ?? 0} · Assessments: ${l.assessments?.length ?? 0}`,
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
    line("Budget", as.budget),
    line("Job post", as.job_post_url),
  ].filter(Boolean).join("\n");
}
