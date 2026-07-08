// Alert cron logic (PRD §9.3–9.5). Idempotent & de-duplicated via alerts_log.
// Designed to run with the service-role (admin) client from guarded /api/cron/* routes.
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { companyToday, companyDow, companyDayStartISO, karachiMidnightISO } from "@/lib/time";
import { shiftDurationHours } from "@/lib/hours";

async function settings(supabase: SupabaseClient) {
  const { data } = await supabase.from("company_settings").select("*").eq("id", 1).maybeSingle();
  return {
    missedCheckoutGraceHours: data?.missed_checkout_grace_hours ?? 1,
  };
}

const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || "admin@acme.test";

async function alreadyAlerted(
  supabase: SupabaseClient,
  employeeId: string,
  type: string,
  sinceISO: string
) {
  const { data } = await supabase
    .from("alerts_log")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("type", type)
    .gte("triggered_at", sinceISO)
    .maybeSingle();
  return !!data;
}

export type MissedCheckin = { id: string; full_name: string; email: string; shift_start: string };
export type MissedCheckout = { id: string; full_name: string; email: string; work_date: string; check_in_time: string };

/** §9.3 Read-only: who has missed check-in RIGHT NOW (shift started + buffer elapsed, no check-in, no
 *  approved leave today). No side effects — used for the live admin view AND by the scan (which alerts).*/
export async function findMissedCheckin(supabase: SupabaseClient, now = new Date()): Promise<MissedCheckin[]> {
  const workDate = companyToday(now);
  const dow = companyDow(now);
  const out: MissedCheckin[] = [];
  const seen = new Set<string>();

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, profiles!inner(id, full_name, email, status)")
    .eq("is_active", true);

  for (const shift of shifts ?? []) {
    const emp = (shift as any).profiles;
    if (!emp || emp.status !== "active" || seen.has(emp.id)) continue;
    if (!shift.days_of_week.includes(dow)) continue;

    // shift start + buffer threshold, anchored to Karachi wall-clock (correct on any server tz)
    const start = new Date(`${workDate}T${String(shift.start_time).slice(0, 8)}+05:00`).getTime();
    const threshold = start + shift.checkin_buffer_minutes * 60_000;
    if (now.getTime() <= threshold) continue;

    const { data: att } = await supabase
      .from("attendance").select("check_in_time")
      .eq("employee_id", emp.id).eq("work_date", workDate).maybeSingle();
    if (att?.check_in_time) continue;

    const { data: leave } = await supabase
      .from("leave_requests").select("id")
      .eq("employee_id", emp.id).eq("status", "approved")
      .lte("start_date", workDate).gte("end_date", workDate).maybeSingle();
    if (leave) continue;

    seen.add(emp.id);
    out.push({ id: emp.id, full_name: emp.full_name, email: emp.email, shift_start: String(shift.start_time).slice(0, 5) });
  }
  return out;
}

/** §9.3 Missed check-in: alert (email + admin feed) for each currently-missing employee, deduped/day. */
export async function scanMissedCheckin(supabase: SupabaseClient, now = new Date()) {
  const dayStart = companyDayStartISO(now);
  const fired: string[] = [];
  for (const emp of await findMissedCheckin(supabase, now)) {
    if (await alreadyAlerted(supabase, emp.id, "missed_checkin", dayStart)) continue;
    await supabase.from("alerts_log").insert({
      employee_id: emp.id,
      type: "missed_checkin",
      message: `${emp.full_name} has not checked in (shift ${emp.shift_start}).`,
      email_sent: true,
    });
    await sendEmail({
      to: emp.email,
      subject: "You haven't checked in yet",
      html: "You haven't checked in yet. Are you working from a different location, or are you on leave?",
    });
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Missed check-in: ${emp.full_name}`,
      html: `${emp.full_name} has not checked in. Expected start ${emp.shift_start}.`,
    });
    fired.push(emp.id);
  }
  return { fired };
}

/** §9.4 Read-only: who is currently OVERDUE on checkout (still open past expected-out + grace). No
 *  side effects — used for the live admin view AND by the scan (which alerts). */
export async function findMissedCheckout(supabase: SupabaseClient, now = new Date()): Promise<MissedCheckout[]> {
  const { missedCheckoutGraceHours } = await settings(supabase);
  const out: MissedCheckout[] = [];

  // Only recent open sessions count as "still checked in" (forgot to check out today/overnight). An
  // open row from weeks ago is a stale record, not an active session — ignore it here.
  const floor = companyToday(new Date(now.getTime() - 2 * 86_400_000));
  const { data: open } = await supabase
    .from("attendance")
    .select("*, profiles!attendance_employee_id_fkey!inner(id, full_name, email)")
    .is("check_out_time", null)
    .not("check_in_time", "is", null)
    .gte("work_date", floor);

  for (const row of open ?? []) {
    const emp = (row as any).profiles;
    const expected = row.expected_hours ?? (await deriveExpected(supabase, row.employee_id));
    if (expected == null) continue;
    const checkIn = new Date(row.check_in_time).getTime();
    const missedThreshold = checkIn + (expected + missedCheckoutGraceHours) * 3_600_000;
    if (now.getTime() > missedThreshold) {
      out.push({ id: emp.id, full_name: emp.full_name, email: emp.email, work_date: row.work_date, check_in_time: row.check_in_time });
    }
  }
  return out;
}

/** §9.4 Missed check-out: one threshold, one alert — employee reminder + admin feed entry.
 * (Merged with the old two-stage "overtime warning" — same condition, it just double-posted.) */
export async function scanMissedCheckout(supabase: SupabaseClient, now = new Date()) {
  const fired: string[] = [];
  for (const emp of await findMissedCheckout(supabase, now)) {
    if (await alreadyAlerted(supabase, emp.id, "missed_checkout", karachiMidnightISO(emp.work_date))) continue;
    await supabase.from("alerts_log").insert({
      employee_id: emp.id,
      type: "missed_checkout",
      message: `${emp.full_name} is still checked in past expected checkout (${emp.work_date}) — forgot to check out, or working late.`,
      email_sent: true,
    });
    await sendEmail({
      to: emp.email,
      subject: "Don't forget to check out",
      html: `You're still checked in for ${emp.work_date}. Set your checkout time: ${process.env.APP_URL}/attendance`,
    });
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Missed checkout: ${emp.full_name}`,
      html: `${emp.full_name} has an open attendance record for ${emp.work_date}.`,
    });
    fired.push(emp.id);
  }
  return { fired };
}

async function deriveExpected(supabase: SupabaseClient, employeeId: string) {
  const { data } = await supabase
    .from("shifts")
    .select("start_time, end_time")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? shiftDurationHours(data.start_time, data.end_time) : null;
}
