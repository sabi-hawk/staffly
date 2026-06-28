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
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

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
  { label: "Handbook", href: "/handbook", icon: BookOpen },
];

const superAdminNav: NavItem[] = [
  { label: "Payroll", href: "/admin/payroll", icon: Wallet },
  { label: "Logs", href: "/admin/logs", icon: ScrollText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function navForRole(role: UserRole): NavItem[] {
  if (role === "employee") return employeeNav;
  if (role === "admin") return adminNav;
  return [...adminNav, ...superAdminNav]; // super_admin
}
