import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeJobHunts } from "@/lib/services/job-hunts";
import { isAuthorizedCron } from "@/lib/cron-auth";

// Daily cleanup of the shared Job Hunt Board: snapshot each BD's per-day hunted count (kept forever),
// then delete board rows older than the retention window. Guarded like every other cron (Bearer
// CRON_SECRET, fail-closed).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const result = await purgeJobHunts(supabase);
  return NextResponse.json({ ok: true, ...result });
}
