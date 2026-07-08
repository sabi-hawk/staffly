// Timesheet correction requests (0052). An employee submits intended check-in/out for a past day that
// is missing or wrong (forgot to check in/out); it stays PENDING until an admin approves — which applies
// the times to attendance — or rejects. Writes flow through RLS (employee inserts own pending only;
// admins decide). The approval APPLY runs with a service-role client so creating/fixing another
// employee's attendance row + session never trips RLS; the admin actor is still recorded (edited_by +
// the request's reviewed_by, plus the audit trigger on the request row).
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { editAttendance } from "@/lib/services/attendance";
import { companyToday } from "@/lib/time";

export const CORRECTION_BACKDATE_DAYS = 7;
export type CorrectionKind = "missing" | "wrong_time" | "forgot_checkout";

export interface CorrectionInput {
  work_date: string;
  check_in?: string | null;   // ISO instant
  check_out?: string | null;  // ISO instant
  kind: CorrectionKind;
  reason?: string;
}

/** Employee submits a correction request (own, pending). Validates the window + that times were given. */
export async function requestCorrection(supabase: SupabaseClient, employeeId: string, input: CorrectionInput) {
  const today = companyToday();
  const floor = companyToday(new Date(new Date(`${today}T00:00:00+05:00`).getTime() - CORRECTION_BACKDATE_DAYS * 86_400_000));
  if (input.work_date > today) throw new Error("You can't request a correction for a future day.");
  if (input.work_date < floor) throw new Error(`Corrections can be requested up to ${CORRECTION_BACKDATE_DAYS} days back. For older days, ask an admin.`);
  if (!input.check_in && !input.check_out) throw new Error("Enter the check-in and/or check-out time you meant.");

  // Link an existing attendance row if the day already has one (missing days won't).
  const { data: att } = await supabase
    .from("attendance").select("id").eq("employee_id", employeeId).eq("work_date", input.work_date).maybeSingle();

  const { data, error } = await supabase
    .from("attendance_correction_requests")
    .insert({
      employee_id: employeeId,
      attendance_id: att?.id ?? null,
      work_date: input.work_date,
      requested_check_in: input.check_in ?? null,
      requested_check_out: input.check_out ?? null,
      kind: input.kind,
      reason: input.reason ?? null,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { request: data };
}

/** Admin decides. Approve → apply the times to attendance (create the day/session if missing, then set
 *  the exact in/out via editAttendance). Reject → record the note. Employee is notified by the DB trigger. */
export async function decideCorrection(
  supabase: SupabaseClient,
  id: string,
  adminId: string,
  decision: { approve: boolean; note?: string }
) {
  const { data: req, error: e1 } = await supabase
    .from("attendance_correction_requests").select("*").eq("id", id).single();
  if (e1 || !req) throw new Error("Correction request not found");
  if (req.status !== "pending") throw new Error("This request has already been decided.");

  if (decision.approve) {
    await applyCorrection(req, adminId);
  }

  const { data: updated, error: e2 } = await supabase
    .from("attendance_correction_requests")
    .update({
      status: decision.approve ? "approved" : "rejected",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      decision_note: decision.note ?? null,
    })
    .eq("id", id)
    .select()
    .single();
  if (e2) throw new Error(e2.message);
  return { request: updated };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Apply an approved correction to attendance: ensure the day + a session exist, then set the exact
 *  in/out. Uses a service-role client so another employee's row can be created/edited reliably. */
async function applyCorrection(req: any, adminId: string) {
  const admin = createAdminClient();
  const employeeId = req.employee_id as string;
  const workDate = req.work_date as string;

  // 1. ensure the attendance row exists (a missing day has none).
  await admin.from("attendance").upsert(
    { employee_id: employeeId, work_date: workDate, status: "present" },
    { onConflict: "employee_id,work_date" }
  );
  const { data: att } = await admin
    .from("attendance").select("id").eq("employee_id", employeeId).eq("work_date", workDate).single();

  // 2. ensure at least one session exists so editAttendance has something to edit. If none, seed one
  //    starting at the requested check-in (fallback to check-out) with an open end.
  const { data: sessions } = await admin
    .from("attendance_sessions").select("id").eq("employee_id", employeeId).eq("work_date", workDate).order("started_at");
  if (!sessions || sessions.length === 0) {
    const seedStart = req.requested_check_in ?? req.requested_check_out;
    await admin.from("attendance_sessions").insert({
      employee_id: employeeId, work_date: workDate, started_at: new Date(seedStart).toISOString(), ended_at: null, source: "correction",
    });
  }

  // 3. set the precise in/out (editAttendance edits first session's start + last session's end, handles
  //    the overnight roll, marks is_edited/edited_by/edit_reason). Triggers recompute totals.
  await editAttendance(admin as any, att!.id as string, adminId, {
    check_in_time: req.requested_check_in ? new Date(req.requested_check_in).toISOString() : undefined,
    check_out_time: req.requested_check_out ? new Date(req.requested_check_out).toISOString() : undefined,
    edit_reason: `timesheet correction (${req.kind})`,
  });
}
