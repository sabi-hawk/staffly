import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestLeave } from "@/lib/services/leaves";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!body.type || !body.start || !body.end)
    return NextResponse.json({ error: "type, start, end required" }, { status: 400 });

  try {
    const result = await requestLeave(
      supabase,
      user.id,
      {
        type: body.type,
        start_date: body.start,
        end_date: body.end,
        reason: body.reason,
        half_day: !!body.half_day,
        half_period: body.half_period === "second" ? "second" : "first",
      },
      { allowUnpaidFallback: !!body.allow_unpaid_fallback }
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
