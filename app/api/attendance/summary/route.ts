import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { saveDailySummary } from "@/lib/services/attendance";

// Save/update the caller's own daily task summary for a work day. RLS (att_update) restricts writes to
// the caller's own attendance rows; the service enforces the same-day-edit / locked / late-add rules.
export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { work_date, html } = await req.json();
    if (!work_date || !/^\d{4}-\d{2}-\d{2}$/.test(work_date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const r = await saveDailySummary(createClient(), work_date, html);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    // Surface only known user-facing validation messages; hide unexpected DB internals.
    const msg = (e as Error).message;
    const known = /short summary|future day|check in first|locked|attendance/i.test(msg);
    return NextResponse.json({ error: known ? msg : "Couldn't save the summary — please try again." }, { status: 400 });
  }
}
