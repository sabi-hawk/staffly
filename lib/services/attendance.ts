// Attendance business logic (PRD §9). Accepts any Supabase client (user-scoped in routes,
// admin in scripts) so it is reusable & testable. The DB trigger computes hours/deficit/extra.
import type { SupabaseClient } from "@supabase/supabase-js";
import { shiftDurationHours, isLate } from "@/lib/hours";
import { companyToday } from "@/lib/time";

async function activeShift(supabase: SupabaseClient, employeeId: string) {
  const { data } = await supabase
    .from("shifts")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** §9.1 Check-in. Idempotent: a second check-in the same day returns the first unchanged. */
export async function checkIn(supabase: SupabaseClient, employeeId: string) {
  const workDate = companyToday();

  const { data: existing } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("work_date", workDate)
    .maybeSingle();

  if (existing?.check_in_time) {
    return { attendance: existing, alreadyCheckedIn: true };
  }

  const shift = await activeShift(supabase, employeeId);
  const expected = shift ? shiftDurationHours(shift.start_time, shift.end_time) : null;
  const now = new Date();
  const late = shift ? isLate(now, shift.start_time, shift.checkin_buffer_minutes, workDate) : false;

  const row = {
    employee_id: employeeId,
    work_date: workDate,
    check_in_time: now.toISOString(),
    check_in_source: "portal",
    expected_hours: expected,
    status: late ? "late" : "present",
  };

  const { data, error } = await supabase
    .from("attendance")
    .upsert(row, { onConflict: "employee_id,work_date" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { attendance: data, alreadyCheckedIn: false, late };
}

/** §9.2 Check-out with optional adjusted time + work log. Time can't exceed now or precede check-in. */
export async function checkOut(
  supabase: SupabaseClient,
  employeeId: string,
  opts: { time?: string; workLog?: unknown } = {}
) {
  const workDate = companyToday();
  const { data: existing } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("work_date", workDate)
    .maybeSingle();
  if (!existing || !existing.check_in_time) throw new Error("Not checked in today");

  const now = new Date();
  let checkout = opts.time ? new Date(opts.time) : now;
  if (checkout.getTime() > now.getTime()) checkout = now; // cannot exceed now
  if (checkout.getTime() < new Date(existing.check_in_time).getTime())
    throw new Error("Checkout cannot precede check-in");

  const { data, error } = await supabase
    .from("attendance")
    .update({
      check_out_time: checkout.toISOString(),
      check_out_source: "portal",
      work_log: opts.workLog ?? existing.work_log ?? null,
    })
    .eq("id", existing.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { attendance: data };
}

/**
 * §9.6 Edit an attendance record's check-in and/or check-out time. Writes an audit_log row
 * (before/after) and sets is_edited; the DB trigger recomputes total/deficit/extra.
 * Employees may edit their own current-day checkout; admins may edit either timestamp on any
 * record (edit_reason expected).
 */
export async function editAttendance(
  supabase: SupabaseClient,
  attendanceId: string,
  actorId: string,
  opts: { check_in_time?: string; check_out_time?: string; edit_reason?: string }
) {
  const { data: before, error: e1 } = await supabase
    .from("attendance")
    .select("*")
    .eq("id", attendanceId)
    .single();
  if (e1 || !before) throw new Error("Attendance not found");

  const newIn = opts.check_in_time ? new Date(opts.check_in_time) : before.check_in_time ? new Date(before.check_in_time) : null;
  const newOut = opts.check_out_time ? new Date(opts.check_out_time) : before.check_out_time ? new Date(before.check_out_time) : null;
  if (newIn && newOut && newOut.getTime() < newIn.getTime())
    throw new Error("Checkout cannot precede check-in");

  const patch: Record<string, unknown> = {
    is_edited: true,
    edited_by: actorId,
    edit_reason: opts.edit_reason ?? null,
  };
  if (opts.check_in_time) patch.check_in_time = newIn!.toISOString();
  if (opts.check_out_time) patch.check_out_time = newOut!.toISOString();

  const { data: after, error } = await supabase
    .from("attendance")
    .update(patch)
    .eq("id", attendanceId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  // audit is captured automatically by the record_audit() DB trigger on attendance.
  return { attendance: after };
}

// Back-compat alias (checkout-only callers).
export const editCheckout = editAttendance;
