import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CRM_PREFIX } from "@/lib/crm/access";
import { PERM } from "@/lib/access/permissions";

const PUBLIC_PATHS = ["/login", "/auth"];
const ADMIN_PREFIX = "/admin";

// Route-prefix → required permission (FRD-08). Longest prefix wins. /admin and /crm fall back to a
// coarse area gate below; unlisted paths are self-service (every role's baseline).
const ROUTE_PERMS: [string, string][] = [
  ["/admin/payroll", PERM.payrollView],
  ["/admin/settings", PERM.settingsManage],
  ["/admin/product", PERM.productDocView],
  ["/admin/employees", PERM.employeesView],
  ["/admin/leaves", PERM.leavesApprove],
  ["/admin/attendance", PERM.attendanceViewAll],
  ["/admin/reports", PERM.reportsView],
  ["/admin/deal-assignments", PERM.dealsDirectory],
  ["/admin/roles", PERM.rolesManage],
  ["/crm/deals", PERM.dealsView],
  ["/crm/analytics", PERM.crmAnalyticsView],
  ["/crm/calendar", PERM.crmCalendarView],
];

/** Refreshes the Supabase session cookie and enforces auth + role gating. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // Unauthenticated → force to /login, carrying the intended destination so signing back in
  // resumes exactly where the user was (deep link / idle-return resume).
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (path !== "/") url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Authenticated hitting /login → send to ?next (same-origin path only) or home
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.search = "";
    if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) {
      const [p, q = ""] = next.split("?");
      url.pathname = p;
      url.search = q ? `?${q}` : "";
    } else {
      url.pathname = "/";
    }
    return NextResponse.redirect(url);
  }

  if (user && !isPublic) {
    // One query: status + the caller's permission grants (via app_role → role_permissions).
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status, app_roles!profiles_app_role_id_fkey(role_permissions(permission_key))")
      .eq("id", user.id)
      .single();

    // Deactivated accounts cannot use the app (records remain in the DB).
    if (!profile || profile.status === "inactive") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("disabled", "1");
      return NextResponse.redirect(url);
    }

    const perms = new Set<string>(
      ((profile as any).app_roles?.role_permissions ?? []).map((r: any) => r.permission_key as string)
    );
    const deny = () => {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    };

    // Specific route → permission mapping (longest prefix first).
    const rule = ROUTE_PERMS.find(([prefix]) => path.startsWith(prefix));
    if (rule && !perms.has(rule[1])) return deny();

    // Coarse area gates for the rest of /admin/* and /crm/*.
    if (!rule && path.startsWith(ADMIN_PREFIX)) {
      // the admin dashboard + activity log: any ops-ish grant qualifies
      const anyOps = [
        PERM.employeesView, PERM.attendanceViewAll, PERM.leavesApprove, PERM.reportsView,
        PERM.payrollView, PERM.activityViewOps, PERM.activityViewFinancial, PERM.settingsManage,
      ].some((p) => perms.has(p));
      if (!anyOps) return deny();
      if (path.startsWith("/admin/logs") && !perms.has(PERM.activityViewOps) && !perms.has(PERM.activityViewFinancial)) return deny();
    }
    if (!rule && path.startsWith(CRM_PREFIX) && !perms.has(PERM.crmAccess)) return deny();
  }

  return response;
}
