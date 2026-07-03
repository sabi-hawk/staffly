import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanMissedCheckin } from "@/lib/services/crons";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const result = await scanMissedCheckin(supabase);
  return NextResponse.json({ ok: true, ...result });
}
