import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { editCheckout } from "@/lib/services/attendance";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!body.check_out_time)
    return NextResponse.json({ error: "check_out_time required" }, { status: 400 });

  try {
    const result = await editCheckout(supabase, params.id, user.id, {
      check_out_time: body.check_out_time,
      edit_reason: body.edit_reason,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
