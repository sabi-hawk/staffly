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

type RoleLike = { role: UserRole | string | null | undefined };
type CrmProfile = RoleLike & { department?: string | null; is_bd_lead?: boolean | null };

export function isAdminRole(role?: UserRole | string | null): boolean {
  return role === "admin" || role === "super_admin";
}
export function isSuperAdminRole(role?: UserRole | string | null): boolean {
  return role === "super_admin";
}

/** Can this person reach the CRM at all? BD-department employees + admins/super-admins. */
export function canSeeCrm(p: CrmProfile): boolean {
  return isAdminRole(p.role) || p.department === BD_DEPARTMENT;
}

/** Elevated CRM tier: sees/manages ALL BDs' data. Admin/super-admin or a flagged BD Lead. */
export function isBdLead(p: CrmProfile): boolean {
  return isAdminRole(p.role) || !!p.is_bd_lead;
}

/** Deals + deal financials are admin/super-admin only (BD Leads TBD per FRD-04/05 Q6). */
export function canSeeDeals(p: RoleLike): boolean {
  return isAdminRole(p.role);
}

export type { CrmProfile };
