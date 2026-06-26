import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { editAttendance } from "@/lib/services/attendance";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!body.check_in_time && !body.check_out_time)
    return NextResponse.json({ error: "check_in_time or check_out_time required" }, { status: 400 });

  try {
    const result = await editAttendance(supabase, params.id, user.id, {
      check_in_time: body.check_in_time,
      check_out_time: body.check_out_time,
      edit_reason: body.edit_reason,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
