import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { saveJobCounts } from "@/lib/services/bd-jobs";

// Save the BD's per-profile job-application counts for a work day. The definer RPC validates that each
// dev_profile is owned by the caller, so a BD can only log against their own profiles.
export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const workDate = String(body.work_date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return NextResponse.json({ error: "Invalid work_date" }, { status: 400 });
    const counts = Array.isArray(body.counts)
      ? body.counts
          .filter((c: unknown) => c && typeof c === "object")
          .map((c: { dev_profile_id?: unknown; count?: unknown }) => ({
            dev_profile_id: String(c.dev_profile_id ?? ""),
            count: Math.max(0, Math.floor(Number(c.count) || 0)),
          }))
          .filter((c: { dev_profile_id: string }) => c.dev_profile_id)
      : [];
    const saved = await saveJobCounts(createClient(), workDate, counts);
    return NextResponse.json({ ok: true, saved });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
