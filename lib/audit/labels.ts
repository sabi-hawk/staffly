// Human-readable rendering for audit_log entries — server + client safe (no server-only imports).
// Generic humanizer + curated labels for the high-traffic modules (FRD-06 diff readability).

export const ENTITY_LABELS: Record<string, string> = {
  profiles: "Employee",
  dev_profiles: "Profile",
  dev_profile_documents: "Profile document",
  dev_stacks: "Stack",
  departments: "Department",
  leads: "Lead",
  interviews: "Interview",
  assessments: "Assessment",
  assessment_documents: "Assessment file",
  deals: "Deal",
  deal_documents: "Deal document",
  receiving_accounts: "Receiving account",
  payment_methods: "Payment method",
  attendance: "Attendance",
  leave_requests: "Leave request",
  leave_balances: "Leave balance",
  shifts: "Shift",
  salary_structures: "Salary",
  payroll_runs: "Payroll",
  compensation_components: "Compensation",
  payslip_components: "Payslip line",
  employee_private: "Employee PII",
  employee_credentials: "Credentials",
  commission_policies: "Commission policy",
  company_settings: "Company settings",
};

const FIELD_LABELS: Record<string, string> = {
  owner_bd_id: "Owner (BD)",
  dev_profile_id: "Profile",
  lead_id: "Lead",
  job_title: "Job title",
  job_post_url: "Job post URL",
  job_description: "Job description",
  given_by: "Given by",
  whom_should_give: "Next-round developer",
  completed_by: "Completed by",
  interview_at: "Interview time",
  dob: "Date of birth",
  profile_dob: "Profile DOB",
  full_name: "Name",
  is_primary: "Primary",
  file_name: "File",
  doc_type: "Type",
  department_id: "Department",
  is_bd_lead: "BD Lead",
  is_developer: "Developer",
  base_salary: "Base salary",
  receiving_account_id: "Receiving account",
  payment_method_id: "Payment method",
  working_developer: "Working developer",
  disqualified_category: "Disqualify reason",
  disqualified_note: "Disqualify note",
  joining_date: "Joining date",
  entry_date: "Entry date",
  completion_date: "Completion date",
  mail_subject: "Mail subject",
  assessment_link: "Assessment link",
  account_number: "Account number",
  holder_name: "Account holder",
  bank_name: "Bank",
  employee_code: "Employee code",
};

export function humanize(key: string): string {
  const s = key.replace(/_id$/, "").replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? humanize(entity);
}

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? humanize(key);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Format a raw audit value for display. */
export function formatValue(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (/password|secret/i.test(key)) return "••••••";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  if ((key.endsWith("_at") || key === "interview_at") && !isNaN(Date.parse(s))) {
    return new Date(s).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  if (UUID.test(s)) return `…${s.slice(-6)}`; // an id reference (name resolution is out of scope)
  return s;
}

const ACTION_VERB: Record<string, string> = {
  insert: "created", update: "updated", delete: "deleted", download: "downloaded",
};

export function actionVerb(action: string): string {
  return ACTION_VERB[action] ?? action;
}

/** One-line plain-English summary of an audit row. */
export function summaryLine(row: {
  actor_email: string | null;
  action: string;
  entity: string;
  changedCount?: number;
}): string {
  const who = row.actor_email ?? "System";
  const verb = actionVerb(row.action);
  const what = entityLabel(row.entity);
  const suffix = row.action === "update" && row.changedCount ? ` (${row.changedCount} field${row.changedCount === 1 ? "" : "s"})` : "";
  return `${who} ${verb} ${what.toLowerCase()}${suffix}`;
}
