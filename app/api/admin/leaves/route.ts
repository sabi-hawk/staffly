import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Admin: directly add an approved leave for an employee (e.g. convert a missing day to
// casual / unpaid / paid). Bypasses the employee-facing notice/quota guards by design.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await supabase.rpc("auth_has_perm", { p_perm: "leaves.approve" })).data)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { employeeId, type, start, end, reason } = body;
  if (!employeeId || !type || !start || !end)
    return NextResponse.json({ error: "employeeId, type, start, end required" }, { status: 400 });

  const { data: days } = await supabase.rpc("working_days", {
    p_employee: employeeId,
    p_start: start,
    p_end: end,
  });
  const daysCount = Math.max(Number(days) || 0, 1);

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      employee_id: employeeId,
      type,
      start_date: start,
      end_date: end,
      days_count: daysCount,
      reason: reason ?? null,
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ request: data });
}
