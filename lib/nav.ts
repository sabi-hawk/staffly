import {
  LayoutDashboard,
  ShieldCheck,
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
  FileStack,
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

const strip = ({ label, href, icon }: PermNavItem): NavItem => ({ label, href, icon });

// ---------------------------------------------------------------------------
// Permission-driven nav (FRD-08), grouped IA (owner ask 2026-07-06): ≤10 top-level
// entries. Each slot lists candidates ops-page-first — the first granted candidate
// wins, so an HR admin gets /admin/attendance while an employee gets /attendance.
// A group with one visible child renders as a flat item (no pointless expander).
// ---------------------------------------------------------------------------

/** First granted candidate per slot (ops page shadows the self page of the same slot). */
function pick(has: (p: string) => boolean, ...candidates: PermNavItem[]): NavItem[] {
  const hit = candidates.find((c) => has(c.perm));
  return hit ? [strip(hit)] : [];
}

/** Group with 0 children → dropped; 1 child → that child flat; else a NavGroup. */
function group(label: string, icon: LucideIcon, children: NavItem[]): NavEntry[] {
  if (children.length === 0) return [];
  if (children.length === 1) return [children[0]];
  return [{ label, icon, children }];
}

const crmChildren: PermNavItem[] = [
  { label: "Profiles", href: "/crm/profiles", icon: Contact, perm: PERM.crmProfilesOwn },
  { label: "Leads", href: "/crm/leads", icon: Briefcase, perm: PERM.crmLeadsOwn },
  { label: "Calendar", href: "/crm/calendar", icon: CalendarRange, perm: PERM.crmCalendarView },
  { label: "BD Performance", href: "/crm/analytics", icon: TrendingUp, perm: PERM.crmAnalyticsView },
  { label: "Deals", href: "/crm/deals", icon: Handshake, perm: PERM.dealsView },
];

/** Build the nav from the caller's permission grants. */
export function navForPerms(perms: ReadonlySet<string> | string[]): NavEntry[] {
  const set = perms instanceof Set ? perms : new Set(perms);
  const has = (p: string) => set.has(p);

  const crm = has(PERM.crmAccess) ? crmChildren.filter((i) => has(i.perm)).map(strip) : [];

  return [
    // Daily-use, flat
    ...pick(has,
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, perm: PERM.attendanceViewAll },
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: PERM.dashboardSelf },
    ),
    ...group("Attendance & Leaves", CalendarClock, [
      ...pick(has,
        { label: "Attendance", href: "/admin/attendance", icon: CalendarClock, perm: PERM.attendanceViewAll },
        { label: "Attendance", href: "/attendance", icon: CalendarClock, perm: PERM.attendanceSelf },
      ),
      ...pick(has,
        { label: "Leaves", href: "/admin/leaves", icon: CalendarDays, perm: PERM.leavesApprove },
        { label: "Leaves", href: "/leaves", icon: CalendarDays, perm: PERM.leavesSelf },
      ),
    ]),
    ...pick(has, { label: "Calendar", href: "/calendar", icon: CalendarRange, perm: PERM.calendarView }),
    ...pick(has, { label: "Announcements", href: "/announcements", icon: Megaphone, perm: PERM.announcementsView }),

    // Big modules
    ...(crm.length ? group("CRM", FolderKanban, crm) : []),
    ...pick(has, { label: "Payroll", href: "/admin/payroll", icon: Wallet, perm: PERM.payrollView }),

    // Management
    ...group("People", Users, [
      ...pick(has, { label: "Employees", href: "/admin/employees", icon: Users, perm: PERM.employeesView }),
      ...pick(has, { label: "Roles", href: "/admin/roles", icon: ShieldCheck, perm: PERM.rolesManage }),
      ...pick(has, { label: "Deal assignments", href: "/admin/deal-assignments", icon: Handshake, perm: PERM.dealsDirectory }),
    ]),
    ...group("Reports & Logs", BarChart3, [
      ...pick(has, { label: "Reports", href: "/admin/reports", icon: BarChart3, perm: PERM.reportsView }),
      ...pick(has, { label: "Activity Log", href: "/admin/logs", icon: ScrollText, perm: PERM.activityViewOps }),
    ]),
    ...group("Documents", FileStack, [
      ...pick(has, { label: "Handbook", href: "/handbook", icon: BookOpen, perm: PERM.handbookView }),
      ...pick(has, { label: "Product doc", href: "/admin/product", icon: FileText, perm: PERM.productDocView }),
    ]),
    ...group("Settings", Settings, [
      ...pick(has, { label: "Company settings", href: "/admin/settings", icon: Settings, perm: PERM.settingsManage }),
      ...pick(has, { label: "My profile", href: "/profile", icon: User, perm: PERM.profileSelf }),
    ]),
  ];
}
