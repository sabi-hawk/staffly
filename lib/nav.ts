import {
  LayoutDashboard,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Megaphone,
  BookOpen,
  User,
  Users,
  Wallet,
  BarChart3,
  Settings,
  ScrollText,
  Contact,
  Briefcase,
  Handshake,
  TrendingUp,
  FolderKanban,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { PERM } from "@/lib/access/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** A collapsible parent with child links (e.g. CRM → Profiles, Leads, …). */
export interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;
export function isNavGroup(e: NavEntry): e is NavGroup {
  return (e as NavGroup).children !== undefined;
}

type PermNavItem = NavItem & { perm: string };

// Permission-driven nav (FRD-08 slice 2): every entry declares the permission that reveals it.
// The self-service block prefers the employee pages; the ops block appears for whoever holds each
// grant — so HR sees people ops without payroll, Accounts sees payroll without employees, custom
// roles compose freely.
const selfNav: PermNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: PERM.dashboardSelf },
  { label: "Attendance", href: "/attendance", icon: CalendarClock, perm: PERM.attendanceSelf },
  { label: "Leaves", href: "/leaves", icon: CalendarDays, perm: PERM.leavesSelf },
  { label: "Calendar", href: "/calendar", icon: CalendarRange, perm: PERM.calendarView },
  { label: "Announcements", href: "/announcements", icon: Megaphone, perm: PERM.announcementsView },
  { label: "Handbook", href: "/handbook", icon: BookOpen, perm: PERM.handbookView },
  { label: "Profile", href: "/profile", icon: User, perm: PERM.profileSelf },
];

const opsNav: PermNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, perm: PERM.attendanceViewAll },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarClock, perm: PERM.attendanceViewAll },
  { label: "Employees", href: "/admin/employees", icon: Users, perm: PERM.employeesView },
  { label: "Leaves", href: "/admin/leaves", icon: CalendarDays, perm: PERM.leavesApprove },
  { label: "Calendar", href: "/calendar", icon: CalendarRange, perm: PERM.calendarView },
  { label: "Announcements", href: "/announcements", icon: Megaphone, perm: PERM.announcementsView },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, perm: PERM.reportsView },
  { label: "Deal assignments", href: "/admin/deal-assignments", icon: Handshake, perm: PERM.dealsDirectory },
  { label: "Activity Log", href: "/admin/logs", icon: ScrollText, perm: PERM.activityViewOps },
  { label: "Payroll", href: "/admin/payroll", icon: Wallet, perm: PERM.payrollView },
  { label: "Settings", href: "/admin/settings", icon: Settings, perm: PERM.settingsManage },
  { label: "Product doc", href: "/admin/product", icon: FileText, perm: PERM.productDocView },
  { label: "Handbook", href: "/handbook", icon: BookOpen, perm: PERM.handbookView },
];

const crmChildren: PermNavItem[] = [
  { label: "Profiles", href: "/crm/profiles", icon: Contact, perm: PERM.crmProfilesOwn },
  { label: "Leads", href: "/crm/leads", icon: Briefcase, perm: PERM.crmLeadsOwn },
  { label: "Calendar", href: "/crm/calendar", icon: CalendarRange, perm: PERM.crmCalendarView },
  { label: "BD Performance", href: "/crm/analytics", icon: TrendingUp, perm: PERM.crmAnalyticsView },
  { label: "Deals", href: "/crm/deals", icon: Handshake, perm: PERM.dealsView },
];

const strip = ({ label, href, icon }: PermNavItem): NavItem => ({ label, href, icon });

/** Build the nav from the caller's permission grants. An "ops" user (any people-ops/financial grant)
 * gets the ops block (which links the admin pages) and drops the duplicate self-service rows the ops
 * block already covers; everyone else gets the self-service block. CRM is a group when any CRM
 * permission is held. */
export function navForPerms(perms: ReadonlySet<string> | string[]): NavEntry[] {
  const set = perms instanceof Set ? perms : new Set(perms);
  const has = (p: string) => set.has(p);

  const ops = opsNav.filter((i) => has(i.perm));
  const isOps = ops.some((i) => i.href.startsWith("/admin"));
  // ops users keep self-service pages that the ops block doesn't already offer under the same label
  const opsLabels = new Set(ops.map((i) => i.label));
  const self = selfNav.filter((i) => has(i.perm) && (!isOps || !opsLabels.has(i.label)));

  const base: NavItem[] = isOps
    ? [...ops.map(strip), ...self.map(strip)]
    : [...self.map(strip)];

  const crm = has(PERM.crmAccess) ? crmChildren.filter((i) => has(i.perm)).map(strip) : [];
  const groups: NavEntry[] = crm.length ? [{ label: "CRM", icon: FolderKanban, children: crm }] : [];
  return [...base, ...groups];
}
