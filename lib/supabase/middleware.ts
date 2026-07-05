import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { BD_DEPARTMENT, CRM_PREFIX, CRM_DEALS_PREFIX } from "@/lib/crm/access";

const PUBLIC_PATHS = ["/login", "/auth"];
const ADMIN_PREFIX = "/admin";

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

  // Unauthenticated → force to /login (except public paths)
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated hitting /login → send to home
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status, department")
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

    const isAdmin = profile.role === "admin" || profile.role === "super_admin";

    // Role gating for /admin/* — employees are redirected away.
    if (path.startsWith(ADMIN_PREFIX) && profile.role === "employee") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // CRM gating for /crm/* — only Business-Development employees + admins/super-admins.
    if (path.startsWith(CRM_PREFIX)) {
      const isBD = isAdmin || profile.department === BD_DEPARTMENT;
      if (!isBD) {
        const url = request.nextUrl.clone();
        url.pathname = profile.role === "employee" ? "/dashboard" : "/admin/dashboard";
        return NextResponse.redirect(url);
      }
      // Deals (name, financials, assignments) are SUPER-ADMIN only (0030). HR/admin can't see them.
      if (path.startsWith(CRM_DEALS_PREFIX) && profile.role !== "super_admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/crm/profiles";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
