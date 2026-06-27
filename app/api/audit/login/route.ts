import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Records a login event (IP + user agent) for the just-authenticated user.
// Note: a browser cannot expose a hardware MAC address; IP + user-agent is what's obtainable.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ua = request.headers.get("user-agent") || "unknown";

  const admin = createAdminClient();
  await admin.from("login_events").insert({
    user_id: user.id,
    email: user.email,
    ip_address: ip,
    user_agent: ua,
  });
  return NextResponse.json({ ok: true });
}
