import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkOut } from "@/lib/services/attendance";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  try {
    const result = await checkOut(supabase, user.id, {
      time: body.time,
      workLog: body.work_log,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
