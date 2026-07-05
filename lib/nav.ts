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
import type { Profile } from "@/lib/types";
import { canSeeCrm, canSeeDeals } from "@/lib/crm/access";

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

const employeeNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/attendance", icon: CalendarClock },
  { label: "Leaves", href: "/leaves", icon: CalendarDays },
  { label: "Calendar", href: "/calendar", icon: CalendarRange },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Handbook", href: "/handbook", icon: BookOpen },
  { label: "Profile", href: "/profile", icon: User },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarClock },
  { label: "Employees", href: "/admin/employees", icon: Users },
  { label: "Leaves", href: "/admin/leaves", icon: CalendarDays },
  { label: "Calendar", href: "/calendar", icon: CalendarRange },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Activity Log", href: "/admin/logs", icon: ScrollText },
  { label: "Handbook", href: "/handbook", icon: BookOpen },
];

const superAdminNav: NavItem[] = [
  { label: "Payroll", href: "/admin/payroll", icon: Wallet },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Product doc", href: "/admin/product", icon: FileText },
];

type NavProfile = Pick<Profile, "role" | "department" | "is_bd_lead">;

/** CRM as a single collapsible group for anyone who can see it (BD or admin). Empty otherwise.
 * RLS scopes rows (a BD sees only their own). FRD-07: Interviews/Assessments are tabs inside Leads. */
function crmNavFor(p: NavProfile): NavGroup[] {
  if (!canSeeCrm(p)) return [];
  const children: NavItem[] = [
    { label: "Profiles", href: "/crm/profiles", icon: Contact },
    { label: "Leads", href: "/crm/leads", icon: Briefcase },
    { label: "BD Performance", href: "/crm/analytics", icon: TrendingUp },
  ];
  if (canSeeDeals(p)) children.push({ label: "Deals", href: "/crm/deals", icon: Handshake });
  return [{ label: "CRM", icon: FolderKanban, children }];
}

export function navForRole(p: NavProfile): NavEntry[] {
  const base =
    p.role === "employee" ? employeeNav : p.role === "admin" ? adminNav : [...adminNav, ...superAdminNav];
  return [...base, ...crmNavFor(p)];
}
