// CRM access helpers — plain module, safe to import from BOTH server and client components
// (no server-only imports here; mirrors the RSC-boundary rule in rules/conventions.md).
import type { Profile, UserRole } from "@/lib/types";

export const BD_DEPARTMENT = "Business Development";

/** CRM URL prefixes (kept here so middleware + nav agree). */
export const CRM_PREFIX = "/crm";
export const CRM_DEALS_PREFIX = "/crm/deals";

/** UUID guard for route path params before they hit the DB / storage keys. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: string | null | undefined): s is string {
  return !!s && UUID_RE.test(s);
}

type RoleLike = { role: UserRole | string | null | undefined; perms?: string[] };
type CrmProfile = RoleLike & { department?: string | null; is_bd_lead?: boolean | null };

export function isAdminRole(role?: UserRole | string | null): boolean {
  return role === "admin" || role === "super_admin";
}
export function isSuperAdminRole(role?: UserRole | string | null): boolean {
  return role === "super_admin";
}

// FRD-08: when the profile carries its permission grants (getCurrentProfile attaches `perms`), these
// helpers are PERMISSION-driven — matching the DB (auth_is_bd/auth_is_bd_lead now key on the same
// grants). The legacy role/department/flag checks remain only as a fallback for profile objects loaded
// without grants (e.g. lists of other users).

/** Can this person reach the CRM at all? */
export function canSeeCrm(p: CrmProfile): boolean {
  if (p.perms) return p.perms.includes("crm.access");
  return isAdminRole(p.role) || p.department === BD_DEPARTMENT;
}

/** Elevated CRM tier: sees/manages ALL BDs' data. */
export function isBdLead(p: CrmProfile): boolean {
  if (p.perms) return p.perms.includes("crm.leads.all") || p.perms.includes("crm.profiles.all");
  return isAdminRole(p.role) || !!p.is_bd_lead;
}

/** Deal details (name, financials, assignments). Super-admin-only by default grants (0030/FRD-08). */
export function canSeeDeals(p: RoleLike): boolean {
  if (p.perms) return p.perms.includes("deals.view");
  return isSuperAdminRole(p.role);
}

/** Owner BD to stamp on a new lead/interview/assessment: BD-Leads/admins may assign to any BD
 * (falling back to self); a plain BD can only own their own rows. RLS enforces this too. */
export function crmOwnerId(
  me: { id: string; role: UserRole | string | null; is_bd_lead?: boolean | null },
  requested?: string | null
): string {
  return isBdLead(me) ? requested || me.id : me.id;
}

export type { CrmProfile };
