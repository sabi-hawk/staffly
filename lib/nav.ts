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
  MessageSquare,
  ClipboardCheck,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { canSeeCrm, canSeeDeals } from "@/lib/crm/access";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
];

type NavProfile = Pick<Profile, "role" | "department" | "is_bd_lead">;

/** CRM nav items for a person who can see the CRM (BD or admin). Empty otherwise.
 * A single /crm/profiles route serves everyone — RLS scopes the rows (a BD sees only their own). */
function crmNavFor(p: NavProfile): NavItem[] {
  if (!canSeeCrm(p)) return [];
  const items: NavItem[] = [
    { label: "CRM Profiles", href: "/crm/profiles", icon: Contact },
    { label: "CRM Leads", href: "/crm/leads", icon: Briefcase },
    { label: "Interviews", href: "/crm/interviews", icon: MessageSquare },
    { label: "Assessments", href: "/crm/assessments", icon: ClipboardCheck },
  ];
  if (canSeeDeals(p)) items.push({ label: "Deals", href: "/crm/deals", icon: Handshake });
  return items;
}

export function navForRole(p: NavProfile): NavItem[] {
  const base =
    p.role === "employee" ? employeeNav : p.role === "admin" ? adminNav : [...adminNav, ...superAdminNav];
  return [...base, ...crmNavFor(p)];
}
