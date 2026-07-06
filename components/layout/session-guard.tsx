"use client";
// Session resume watchdog. Token refresh itself is automatic (supabase-js auto-refresh in the
// browser + the middleware on every navigation), so this only handles the rare terminal case:
// the refresh token is gone/revoked (signed out elsewhere, account deactivated, very long sleep).
// On tab-return or every 10 minutes it asks for the session — getSession() transparently refreshes
// an expired access token first — and if there is genuinely no session left, it sends the user to
// /login with a `next` link back to this exact page, so signing in resumes where they were.
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function SessionGuard() {
  useEffect(() => {
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const { data } = await createClient().auth.getSession();
        if (!data.session) {
          const next = location.pathname + location.search;
          location.replace(`/login?expired=1&next=${encodeURIComponent(next)}`);
        }
      } finally {
        checking = false;
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    const t = setInterval(check, 10 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      clearInterval(t);
    };
  }, []);
  return null;
}
