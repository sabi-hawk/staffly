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
  email_secondary: string | null;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  cnic: string | null;
  gender: string | null;
  employee_code: string | null;
  position: string | null;
  department: string | null;
  reports_to: string | null;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  joining_date: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  emergency_relation: string | null;
  bank_account_number: string | null;
  bank_account_title: string | null;
  bank_name: string | null;
  iban: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompensationComponent {
  id: string;
  employee_id: string;
  label: string;
  amount: number;
  description: string | null;
  recurring: boolean;
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
