// The permission catalog — mirrors the `permissions` table seeded in 0035 (FRD-08). Plain module,
// safe for server and client. Keys are the single source of truth for access checks; add a key here
// AND in a migration when a new module lands.
export const PERM = {
  // Self-service
  dashboardSelf: "dashboard.self",
  attendanceSelf: "attendance.self",
  attendanceSummarySelf: "attendance.summary_self",
  leavesSelf: "leaves.self",
  calendarView: "calendar.view",
  announcementsView: "announcements.view",
  handbookView: "handbook.view",
  profileSelf: "profile.self",
  // People ops
  employeesView: "employees.view",
  employeesManage: "employees.manage",
  employeesCredentials: "employees.credentials",
  employeesFlags: "employees.flags",
  employeesPrivatePii: "employees.private_pii",
  attendanceViewAll: "attendance.view_all",
  attendanceEditAll: "attendance.edit_all",
  leavesApprove: "leaves.approve",
  reportsView: "reports.view",
  announcementsManage: "announcements.manage",
  holidaysManage: "holidays.manage",
  activityViewOps: "activity.view_ops",
  // Financial
  payrollView: "payroll.view",
  payrollManage: "payroll.manage",
  compensationManage: "compensation.manage",
  payslipsViewAll: "payslips.view_all",
  activityViewFinancial: "activity.view_financial",
  // CRM
  crmAccess: "crm.access",
  crmProfilesOwn: "crm.profiles.own",
  crmProfilesAll: "crm.profiles.all",
  crmProfilesDocs: "crm.profiles.docs",
  crmProfilesPassword: "crm.profiles.password",
  crmProfilesManage: "crm.profiles.manage",
  crmLeadsOwn: "crm.leads.own",
  crmLeadsAll: "crm.leads.all",
  crmContacts: "crm.contacts",
  crmCalendarView: "crm.calendar.view",
  crmAnalyticsView: "crm.analytics.view",
  dealsView: "deals.view",
  dealsManage: "deals.manage",
  dealsDirectory: "deals.directory",
  // Platform
  settingsManage: "settings.manage",
  rolesManage: "roles.manage",
  usersAssignRoles: "users.assign_roles",
  productDocView: "product_doc.view",
  notificationsView: "notifications.view",
} as const;

export type PermKey = (typeof PERM)[keyof typeof PERM];

/** The default system role keys (seeded in 0035). */
export const SYSTEM_ROLES = [
  "employee", "deal_developer", "bd", "bd_lead", "hr", "accounts", "admin", "super_admin",
] as const;
