// Hand-written DB types (subset) matching supabase/migrations. snake_case to mirror SQL.

export type UserRole = "employee" | "admin" | "super_admin";
export type EmploymentType = "onsite" | "remote";
export type EmployeeStatus = "active" | "inactive";
export type AttendanceStatus = "present" | "late" | "half_day" | "absent" | "on_leave";
export type LeaveType = "annual" | "casual" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type SalaryType = "fixed" | "fixed_plus_overtime" | "commission";
export type PayrollStatus = "draft" | "finalised";
export type AlertType = "missed_checkin" | "missed_checkout" | "late_arrival" | "overtime_warning";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  username: string | null;
  email_secondary: string | null;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  gender: string | null;
  employee_code: string | null;
  position: string | null;
  department: string | null;
  department_id: string | null;
  is_bd_lead: boolean;
  is_developer: boolean;
  is_deal_developer: boolean;
  app_role_id: string | null;
  /** Permission grants + role identity, attached by getCurrentProfile() (FRD-08). */
  perms?: string[];
  app_role_key?: string | null;
  app_role_name?: string | null;
  reports_to: string | null;
  employment_type: EmploymentType;
  contract_type: "permanent" | "probation";
  status: EmployeeStatus;
  joining_date: string | null;
  date_of_birth: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  emergency_relation: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  company: string;
  role: string | null;
  dev_profile_id: string | null;
  owner_bd_id: string;
  status: "in_progress" | "on_hold" | "closed" | "rejected" | "dismissed";
  feedback: string | null;
  budget: string | null; // company's stated budget (FRD-07)
  expected_budget: string | null; // what the BD asked for
  job_description: string | null; // rich-text HTML
  notes: string | null; // BD notepad (rich-text HTML) — HR contact, deal details
  disqualified_category: "fake_job" | "low_pay" | "unpaid_collab" | "other" | null;
  disqualified_note: string | null;
  disqualified_by: string | null;
  disqualified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceivingAccount {
  id: string;
  holder_name: string;
  bank_name: string | null;
  account_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface Deal {
  id: string;
  lead_id: string | null;
  designation: string | null;
  joining_date: string | null;
  dev_profile_id: string | null;
  working_developer: string | null;
  salary: number | null;
  receiving_account_id: string | null;
  payment_method_id: string | null;
  profile_dob: string | null;
  status: "active" | "ended" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: string;
  lead_id: string | null;
  dev_profile_id: string | null;
  owner_bd_id: string;
  job_title: string | null;
  company: string | null;
  job_post_url: string | null;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  given_by: string | null;
  whom_should_give: string | null;
  interview_at: string | null;
  received_date: string | null; // email-received date (editable, FRD-07)
  round: "1st" | "2nd" | "3rd" | "final" | null;
  outcome: "pending" | "selected" | "rejected" | "on_hold" | null;
  feedback: string | null; // FRD-07
  notes: string | null;
  notes2: string | null;
  dismissed_at: string | null; // soft-hide (0049): BD may dismiss, only super restores/deletes
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  lead_id: string | null;
  dev_profile_id: string | null;
  owner_bd_id: string;
  job_title: string | null;
  company: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  entry_date: string | null;
  deadline: string | null;
  completion_date: string | null;
  mail_subject: string | null;
  job_post_url: string | null;
  job_description: string | null;
  completed_by: string | null;
  whom_should_complete: string | null; // developer who SHOULD do it (mirror of interview.whom_should_give)
  priority: "high" | "medium" | "low" | null;
  budget: string | null;
  assessment_link: string | null;
  duration: string | null;
  feedback: string | null; // FRD-07
  notes: string | null;
  extra: string | null;
  dismissed_at: string | null; // soft-hide (0049): BD may dismiss, only super restores/deletes
  created_at: string;
  updated_at: string;
}

/** Sensitive PII — separate table, readable only by the employee themselves or a super admin. */
export interface EmployeePrivate {
  employee_id: string;
  cnic: string | null;
  bank_account_number: string | null;
  bank_account_title: string | null;
  bank_name: string | null;
  iban: string | null;
  updated_at: string;
}

export interface CompensationComponent {
  id: string;
  employee_id: string;
  label: string;
  amount: number;
  description: string | null;
  recurring: boolean;
  is_fixed_amount: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayslipComponent {
  id: string;
  payroll_run_id: string;
  label: string;
  amount: number;
  kind: "base" | "addition" | "deduction";
  description: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string; // insert | update | delete | attendance.edit | leave.approved ...
  entity: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface EmployeeCredentials {
  employee_id: string;
  portal_password: string | null;
  updated_at: string;
}

export interface CommissionPolicy {
  id: string;
  employee_id: string;
  label: string;
  rate: number;
  description: string | null;
  created_at: string;
}

export interface LoginEvent {
  id: string;
  user_id: string | null;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Shift {
  id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  checkin_buffer_minutes: number;
  effective_from: string;
  is_active: boolean;
}

export interface Attendance {
  id: string;
  employee_id: string;
  work_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_source: string | null;
  check_out_source: string | null;
  status: AttendanceStatus;
  work_log: unknown | null;
  expected_hours: number | null;
  total_hours: number | null;
  deficit_hours: number;
  extra_hours: number;
  is_edited: boolean;
  edited_by: string | null;
  edit_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  decision_note: string | null;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  year: number;
  annual_total: number;
  annual_used: number;
  casual_month: number;
  casual_used: number;
  unpaid_used: number;
}

export interface Benefit {
  label: string;
  amount: number;
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  type: SalaryType;
  base_salary: number;
  commission_rate: number;
  overtime_rate_hour: number;
  benefits: Benefit[];
  currency: string;
  effective_from: string;
  is_active: boolean;
}

export interface PayrollRun {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  working_days: number;
  days_present: number;
  unpaid_days: number;
  total_hours: number;
  total_extra_hours: number;
  total_deficit_hours: number;
  base_salary: number;
  overtime_pay: number;
  commission_amount: number;
  benefits_total: number;
  deductions: number;
  net_pay: number;
  status: PayrollStatus;
  additions_total: number;
  payment_status: "pending" | "paid";
  paid_at: string | null;
  paid_amount: number | null;
  credited_account: string | null;
  notes: string | null;
  generated_by: string | null;
  finalised_at: string | null;
}
