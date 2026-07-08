import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { requestCorrection, type CorrectionKind } from "@/lib/services/attendance-corrections";

const KINDS: CorrectionKind[] = ["missing", "wrong_time", "forgot_checkout"];

// Employee submits a timesheet correction request for a past day (own; stays pending for admin review).
export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const work_date = String(body.work_date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date)) return NextResponse.json({ error: "Invalid work_date" }, { status: 400 });
    const kind: CorrectionKind = KINDS.includes(body.kind) ? body.kind : "wrong_time";
    const result = await requestCorrection(createClient(), me.id, {
      work_date,
      check_in: body.check_in || null,
      check_out: body.check_out || null,
      kind,
      reason: body.reason,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
