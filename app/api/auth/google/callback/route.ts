import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { exchangeCodeForTokens, fetchGoogleEmail } from "@/lib/google/oauth";
import { saveGoogleTokens } from "@/lib/google/tokens";

export const dynamic = "force-dynamic";

// Google redirects here after consent. Verify the CSRF state, exchange the code for tokens, look up the
// connected email, store the tokens (service role), and bounce back to the profile page.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (status: string) => NextResponse.redirect(new URL(`/profile?google=${status}`, req.url));

  const me = await getCurrentProfile();
  if (!me) return NextResponse.redirect(new URL("/login", req.url));

  const error = url.searchParams.get("error");
  if (error) return back(error === "access_denied" ? "denied" : "error");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers.get("cookie")?.match(/(?:^|;\s*)g_oauth_state=([^;]+)/)?.[1];
  if (!code || !state || !cookieState || state !== cookieState) return back("error");

  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const origin = `${proto}://${host}`;

    const tokens = await exchangeCodeForTokens({ code, origin });
    const email = await fetchGoogleEmail(tokens.access_token);
    await saveGoogleTokens(me.id, tokens, email);

    const res = back("connected");
    res.cookies.set("g_oauth_state", "", { path: "/", maxAge: 0 }); // clear the state cookie
    return res;
  } catch {
    return back("error");
  }
}
