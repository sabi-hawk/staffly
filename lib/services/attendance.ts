// Attendance business logic (PRD §9 + multi-session "break" support).
// A day can have multiple check-in→check-out sessions (attendance_sessions); the day's
// total_hours = sum of completed sessions (breaks excluded), maintained by DB triggers.
// The `attendance` row remains the per-day summary (status, work_log, expected, totals).
import type { SupabaseClient } from "@supabase/supabase-js";
import { shiftDurationHours, isLate } from "@/lib/hours";
import { companyToday } from "@/lib/time";
import { sanitizeRichText } from "@/lib/sanitize";

async function activeShift(supabase: SupabaseClient, employeeId: string) {
  const { data } = await supabase
    .from("shifts").select("*").eq("employee_id", employeeId).eq("is_active", true)
    .order("effective_from", { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function openSession(supabase: SupabaseClient, employeeId: string, workDate: string) {
  const { data } = await supabase
    .from("attendance_sessions").select("*")
    .eq("employee_id", employeeId).eq("work_date", workDate).is("ended_at", null)
    .maybeSingle();
  return data;
}

/** Today's sessions + whether currently working + accumulated completed seconds. */
export async function todayAttendance(supabase: SupabaseClient, employeeId: string) {
  const workDate = companyToday();
  const { data: row } = await supabase
    .from("attendance").select("*").eq("employee_id", employeeId).eq("work_date", workDate).maybeSingle();
  const { data: sessions } = await supabase
    .from("attendance_sessions").select("*")
    .eq("employee_id", employeeId).eq("work_date", workDate).order("started_at");
  const list = sessions ?? [];
  const open = list.find((s) => !s.ended_at) ?? null;
  const completedSeconds = list
    .filter((s) => s.ended_at)
    .reduce((sum, s) => sum + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000, 0);
  return { attendance: row, sessions: list, open, completedSeconds, openSince: open?.started_at ?? null };
}

/** §9.1 Check-in — starts a new session. Idempotent while a session is already open. */
export async function checkIn(supabase: SupabaseClient, employeeId: string) {
  const workDate = companyToday();
  const open = await openSession(supabase, employeeId, workDate);
  if (open) {
    const { data: attendance } = await supabase
      .from("attendance").select("*").eq("employee_id", employeeId).eq("work_date", workDate).maybeSingle();
    return { attendance, alreadyCheckedIn: true };
  }

  const shift = await activeShift(supabase, employeeId);
  const expected = shift ? shiftDurationHours(shift.start_time, shift.end_time) : null;
  const now = new Date();

  // ensure the day row exists with expected hours; mark late only on the first session
  const { data: existing } = await supabase
    .from("attendance").select("id, check_in_time").eq("employee_id", employeeId).eq("work_date", workDate).maybeSingle();
  const firstOfDay = !existing?.check_in_time;
  const late = firstOfDay && shift ? isLate(now, shift.start_time, shift.checkin_buffer_minutes, workDate) : false;

  await supabase.from("attendance").upsert(
    { employee_id: employeeId, work_date: workDate, expected_hours: expected, status: late ? "late" : "present" },
    { onConflict: "employee_id,work_date" }
  );

  const { error } = await supabase.from("attendance_sessions").insert({
    employee_id: employeeId, work_date: workDate, started_at: now.toISOString(), source: "portal",
  });
  if (error) throw new Error(error.message);

  const { data: attendance } = await supabase
    .from("attendance").select("*").eq("employee_id", employeeId).eq("work_date", workDate).maybeSingle();
  return { attendance, alreadyCheckedIn: false, late };
}

/** §9.2 Check-out — ends the open session (break or end of day). Optional work log + time. */
export async function checkOut(
  supabase: SupabaseClient,
  employeeId: string,
  opts: { time?: string; workLog?: unknown } = {}
) {
  const workDate = companyToday();
  const open = await openSession(supabase, employeeId, workDate);
  if (!open) throw new Error("You are not currently checked in");

  const now = new Date();
  let end = opts.time ? new Date(opts.time) : now;
  if (end.getTime() > now.getTime()) end = now;
  if (end.getTime() < new Date(open.started_at).getTime()) throw new Error("Checkout cannot precede check-in");

  const { error } = await supabase.from("attendance_sessions").update({ ended_at: end.toISOString() }).eq("id", open.id);
  if (error) throw new Error(error.message);

  if (opts.workLog !== undefined) {
    await supabase.from("attendance").update({ work_log: opts.workLog }).eq("employee_id", employeeId).eq("work_date", workDate);
  }

  const { data: attendance } = await supabase
    .from("attendance").select("*").eq("employee_id", employeeId).eq("work_date", workDate).maybeSingle();
  return { attendance };
}

/**
 * §9.6 Edit an attendance record's check-in/out. For session days, edits the first session's
 * start and/or the last session's end; for legacy days (no sessions) edits the row directly.
 * Sets is_edited + writes audit (DB trigger). The DB recomputes totals.
 */
export async function editAttendance(
  supabase: SupabaseClient,
  attendanceId: string,
  actorId: string,
  opts: { check_in_time?: string; check_out_time?: string; edit_reason?: string }
) {
  const { data: before, error: e1 } = await supabase.from("attendance").select("*").eq("id", attendanceId).single();
  if (e1 || !before) throw new Error("Attendance not found");

  const { data: sessions } = await supabase
    .from("attendance_sessions").select("*")
    .eq("employee_id", before.employee_id).eq("work_date", before.work_date).order("started_at");

  if (sessions && sessions.length > 0) {
    if (opts.check_in_time) {
      const first = sessions[0];
      const newIn = new Date(opts.check_in_time);
      if (first.ended_at && newIn.getTime() > new Date(first.ended_at).getTime())
        throw new Error("Check-in cannot be after the session's checkout");
      await supabase.from("attendance_sessions").update({ started_at: newIn.toISOString() }).eq("id", first.id);
    }
    if (opts.check_out_time) {
      const last = sessions[sessions.length - 1];
      const newOut = new Date(opts.check_out_time);
      if (newOut.getTime() < new Date(last.started_at).getTime())
        throw new Error("Checkout cannot precede check-in");
      await supabase.from("attendance_sessions").update({ ended_at: newOut.toISOString() }).eq("id", last.id);
    }
  } else {
    const newIn = opts.check_in_time ? new Date(opts.check_in_time) : before.check_in_time ? new Date(before.check_in_time) : null;
    const newOut = opts.check_out_time ? new Date(opts.check_out_time) : before.check_out_time ? new Date(before.check_out_time) : null;
    if (newIn && newOut && newOut.getTime() < newIn.getTime()) throw new Error("Checkout cannot precede check-in");
    const patch: Record<string, unknown> = {};
    if (opts.check_in_time) patch.check_in_time = newIn!.toISOString();
    if (opts.check_out_time) patch.check_out_time = newOut!.toISOString();
    await supabase.from("attendance").update(patch).eq("id", attendanceId);
  }

  // mark edited (this also recomputes totals for legacy rows; session rows recomputed by trigger)
  const { data: after } = await supabase
    .from("attendance")
    .update({ is_edited: true, edited_by: actorId, edit_reason: opts.edit_reason ?? null })
    .eq("id", attendanceId).select().single();
  return { attendance: after };
}

export const editCheckout = editAttendance;

/**
 * Save (or update) the employee's daily task summary (rich-text HTML) for a work day. Rules:
 *  - same-day (workDate == today): freely add/edit;
 *  - past day with a summary already present: LOCKED (throws);
 *  - past day still missing: allowed as a LATE add (summary_late = true);
 *  - future day: rejected. The day must have an attendance row (they must have checked in).
 * HTML is sanitized at the write path (like the lead job-description/notes fields).
 */
export async function saveDailySummary(
  supabase: SupabaseClient,
  workDate: string,
  rawHtml: string | null
) {
  const html = sanitizeRichText(rawHtml);
  const text = (html ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
  if (!text) throw new Error("Please write a short summary before saving.");

  // The rules (same-day edit / past-locked / past-late / no-future / must-have-attendance) and the
  // write to the summary columns only are enforced by the security-definer function (0028), which uses
  // auth.uid() — so a late add on a past row works without letting employees edit past times.
  const { data, error } = await supabase.rpc("save_daily_summary", { p_work_date: workDate, p_html: html });
  if (error) throw new Error(error.message);
  return { late: !!data };
}
