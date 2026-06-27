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
    overtimeWarningHours: data?.overtime_warning_hours ?? 2,
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

/** §9.3 Missed check-in: shift started + buffer elapsed, no check-in, no approved leave today. */
export async function scanMissedCheckin(supabase: SupabaseClient, now = new Date()) {
  const workDate = companyToday(now);
  const dayStart = companyDayStartISO(now);
  const dow = companyDow(now);
  const fired: string[] = [];
  const alertedThisRun = new Set<string>();

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, profiles!inner(id, full_name, email, status)")
    .eq("is_active", true);

  for (const shift of shifts ?? []) {
    const emp = (shift as any).profiles;
    if (!emp || emp.status !== "active") continue;
    if (alertedThisRun.has(emp.id)) continue;
    if (!shift.days_of_week.includes(dow)) continue;

    // shift start + buffer threshold (company-local wall clock applied to today)
    const [h, m] = shift.start_time.split(":").map(Number);
    const threshold = new Date(now);
    threshold.setHours(h, m + shift.checkin_buffer_minutes, 0, 0);
    if (now.getTime() <= threshold.getTime()) continue;

    const { data: att } = await supabase
      .from("attendance")
      .select("check_in_time")
      .eq("employee_id", emp.id)
      .eq("work_date", workDate)
      .maybeSingle();
    if (att?.check_in_time) continue;

    const { data: leave } = await supabase
      .from("leave_requests")
      .select("id")
      .eq("employee_id", emp.id)
      .eq("status", "approved")
      .lte("start_date", workDate)
      .gte("end_date", workDate)
      .maybeSingle();
    if (leave) continue;

    if (await alreadyAlerted(supabase, emp.id, "missed_checkin", dayStart)) continue;

    await supabase.from("alerts_log").insert({
      employee_id: emp.id,
      type: "missed_checkin",
      message: `${emp.full_name} has not checked in (shift ${shift.start_time}).`,
      email_sent: true,
    });
    alertedThisRun.add(emp.id);
    await sendEmail({
      to: emp.email,
      subject: "You haven't checked in yet",
      html: "You haven't checked in yet. Are you working from a different location, or are you on leave?",
    });
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Missed check-in: ${emp.full_name}`,
      html: `${emp.full_name} has not checked in. Expected start ${shift.start_time}.`,
    });
    fired.push(emp.id);
  }
  return { fired };
}

/** §9.4 Missed check-out + §9.5 overtime warning over open attendance rows. */
export async function scanMissedCheckout(supabase: SupabaseClient, now = new Date()) {
  const { missedCheckoutGraceHours, overtimeWarningHours } = await settings(supabase);
  const fired: string[] = [];
  const overtime: string[] = [];

  const { data: open } = await supabase
    .from("attendance")
    .select("*, profiles!attendance_employee_id_fkey!inner(id, full_name, email)")
    .is("check_out_time", null)
    .not("check_in_time", "is", null);

  for (const row of open ?? []) {
    const emp = (row as any).profiles;
    const expected =
      row.expected_hours ?? (await deriveExpected(supabase, row.employee_id));
    if (expected == null) continue;

    const checkIn = new Date(row.check_in_time).getTime();
    const expectedOut = checkIn + expected * 3_600_000;
    const missedThreshold = expectedOut + missedCheckoutGraceHours * 3_600_000;
    const overtimeThreshold = expectedOut + overtimeWarningHours * 3_600_000;

    if (now.getTime() > missedThreshold) {
      if (!(await alreadyAlerted(supabase, emp.id, "missed_checkout", karachiMidnightISO(row.work_date)))) {
        await supabase.from("alerts_log").insert({
          employee_id: emp.id,
          type: "missed_checkout",
          message: `${emp.full_name} did not check out (${row.work_date}).`,
          email_sent: true,
        });
        await sendEmail({
          to: emp.email,
          subject: "Don't forget to check out",
          html: `You're still checked in for ${row.work_date}. Set your checkout time: ${process.env.APP_URL}/attendance`,
        });
        await sendEmail({
          to: ADMIN_EMAIL,
          subject: `Missed checkout: ${emp.full_name}`,
          html: `${emp.full_name} has an open attendance record for ${row.work_date}.`,
        });
        fired.push(emp.id);
      }
    }

    if (now.getTime() > overtimeThreshold) {
      if (!(await alreadyAlerted(supabase, emp.id, "overtime_warning", karachiMidnightISO(row.work_date)))) {
        await supabase.from("alerts_log").insert({
          employee_id: emp.id,
          type: "overtime_warning",
          message: `${emp.full_name} is ${overtimeWarningHours}h+ past expected checkout.`,
          email_sent: true,
        });
        await sendEmail({
          to: ADMIN_EMAIL,
          subject: `Overtime warning: ${emp.full_name}`,
          html: `${emp.full_name} is still checked in well past expected checkout (${row.work_date}).`,
        });
        overtime.push(emp.id);
      }
    }
  }
  return { fired, overtime };
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
