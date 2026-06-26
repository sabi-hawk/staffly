import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanMissedCheckin } from "@/lib/services/crons";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const result = await scanMissedCheckin(supabase);
  return NextResponse.json({ ok: true, ...result });
}
