import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { editAttendance } from "@/lib/services/attendance";
import { companyToday } from "@/lib/time";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!body.check_in_time && !body.check_out_time)
    return NextResponse.json({ error: "check_in_time or check_out_time required" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  // Employees may only edit their OWN CURRENT-DAY checkout (not check-in, not past days).
  if (!isAdmin) {
    const { data: row } = await supabase.from("attendance").select("employee_id, work_date").eq("id", params.id).single();
    if (!row || row.employee_id !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (row.work_date !== companyToday())
      return NextResponse.json({ error: "You can only edit today's record" }, { status: 403 });
    if (body.check_in_time)
      return NextResponse.json({ error: "Only an admin can edit check-in time" }, { status: 403 });
  }

  try {
    const result = await editAttendance(supabase, params.id, user.id, {
      check_in_time: isAdmin ? body.check_in_time : undefined,
      check_out_time: body.check_out_time,
      edit_reason: body.edit_reason,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
