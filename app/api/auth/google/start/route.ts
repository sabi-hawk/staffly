import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { calendarApiEnabled, googleAuthUrl } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

// Kick off the Google OAuth consent flow for the logged-in CRM user. Sets a short-lived, httpOnly
// state cookie (CSRF) and redirects to Google. The origin (localhost vs prod) determines the redirect
// URI, which must match one registered in the Google console.
export async function GET(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.redirect(new URL("/login", req.url));
  if (!hasPermP(me, PERM.crmAccess)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!calendarApiEnabled()) return NextResponse.json({ error: "Google Calendar API is not enabled." }, { status: 400 });

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const state = randomUUID();
  const res = NextResponse.redirect(googleAuthUrl({ origin, state }));
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: proto === "https",
    sameSite: "lax", // survives the top-level GET redirect back from Google
    path: "/",
    maxAge: 600,
  });
  return res;
}
