import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkIn, checkOut, editAttendance } from "@/lib/services/attendance";
import { requestLeave, decideLeave, annualUsedThisYear, leaveSummary } from "@/lib/services/leaves";

const ymd = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
// build a date range covering exactly `n` weekdays, starting at the next Monday ≥21 days out
function weekdayRange(n: number) {
  const d = new Date(); d.setDate(d.getDate() + 21);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  let count = 0; const cur = new Date(d); let last = new Date(d);
  while (count < n) { const dow = cur.getDay(); if (dow !== 0 && dow !== 6) { count++; last = new Date(cur); } cur.setDate(cur.getDate() + 1); }
  return { start: ymd(d), end: ymd(last) };
}
import { scanMissedCheckin, scanMissedCheckout } from "@/lib/services/crons";
import { companyToday, companyDow } from "@/lib/time";

// real employees
const SHAIZA = "00000000-0000-0000-0000-000000000021";
const AHMAD = "00000000-0000-0000-0000-000000000022";
const FATIMA = "00000000-0000-0000-0000-000000000023";
const AREEBA = "00000000-0000-0000-0000-000000000024";
const HAMZA = "00000000-0000-0000-0000-000000000027";
const FOUNDER = "00000000-0000-0000-0000-000000000001";

let admin: SupabaseClient;
beforeAll(() => {
  admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
});

describe("§14.4 integration flows (cloud)", () => {
  it("flow 1 — check-in idempotency", async () => {
    const today = companyToday();
    await admin.from("attendance_sessions").delete().eq("employee_id", SHAIZA).eq("work_date", today);
    await admin.from("attendance").delete().eq("employee_id", SHAIZA).eq("work_date", today);
    const first = await checkIn(admin, SHAIZA);
    expect(first.alreadyCheckedIn).toBe(false);
    const second = await checkIn(admin, SHAIZA);
    expect(second.alreadyCheckedIn).toBe(true);
    expect(second.attendance.check_in_time).toBe(first.attendance.check_in_time);
    const { data } = await admin.from("attendance").select("id").eq("employee_id", SHAIZA).eq("work_date", today);
    expect(data!.length).toBe(1);
  });

  it("flow 2 — checkout persists work_log + computes hours", async () => {
    const log = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Closed two BD leads." }] }] };
    const { attendance } = await checkOut(admin, SHAIZA, { workLog: log });
    expect(attendance.check_out_time).toBeTruthy();
    expect(attendance.work_log).toEqual(log);
    expect(Number(attendance.total_hours)).toBeGreaterThanOrEqual(0);
  });

  it("flow 3 — edit both times: hours recomputed, is_edited set", async () => {
    const today = companyToday();
    const { data: row } = await admin.from("attendance").select("*").eq("employee_id", SHAIZA).eq("work_date", today).single();
    const newOut = new Date(new Date(row!.check_in_time).getTime() + 8 * 3600000).toISOString();
    const { attendance } = await editAttendance(admin, row!.id, FOUNDER, { check_out_time: newOut, edit_reason: "left early" });
    expect(attendance.is_edited).toBe(true);
    expect(Number(attendance.total_hours)).toBe(8);
  });

  it("audit — an authenticated edit is logged with before/after (DB trigger)", async () => {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    await anon.auth.signInWithPassword({ email: "super.admin@softonoma.com", password: "Softonoma@SaDM7k29" });
    const before = await anon.from("audit_log").select("id", { count: "exact", head: true }).eq("entity", "profiles");
    await anon.from("profiles").update({ department: "Engineering (audit " + Date.now() + ")" }).eq("id", AHMAD);
    const after = await anon.from("audit_log").select("*").eq("entity", "profiles").order("created_at", { ascending: false }).limit(1);
    expect((after.data ?? []).length).toBe(1);
    expect(after.data![0].action).toBe("update");
    expect(after.data![0].actor_email).toBe("super.admin@softonoma.com");
    expect(after.data![0].before).toBeTruthy();
    expect(after.data![0].after).toBeTruthy();
  });

  it("flow 4 — missed-checkin cron: alert once, de-duped", async () => {
    const today = companyToday();
    await admin.from("attendance").delete().eq("employee_id", AHMAD).eq("work_date", today);
    await admin.from("alerts_log").delete().eq("employee_id", AHMAD).eq("type", "missed_checkin");
    await admin.from("shifts").update({ days_of_week: [0, 1, 2, 3, 4, 5, 6] }).eq("employee_id", AHMAD);
    // 15:00 Karachi today — safely past every shift start + buffer, same Karachi day
    const lateNow = new Date(`${companyToday()}T15:00:00+05:00`);
    await scanMissedCheckin(admin, lateNow);
    let alerts = await admin.from("alerts_log").select("*").eq("employee_id", AHMAD).eq("type", "missed_checkin");
    expect(alerts.data!.length).toBe(1);
    expect(alerts.data![0].email_sent).toBe(true);
    await scanMissedCheckin(admin, lateNow);
    alerts = await admin.from("alerts_log").select("*").eq("employee_id", AHMAD).eq("type", "missed_checkin");
    expect(alerts.data!.length).toBe(1);
    await admin.from("shifts").update({ days_of_week: [1, 2, 3, 4, 5] }).eq("employee_id", AHMAD);
  });

  it("flow 5 — missed-checkout cron: alert then none after checkout", async () => {
    const today = companyToday();
    await admin.from("alerts_log").delete().eq("employee_id", FATIMA).eq("type", "missed_checkout");
    await admin.from("attendance").delete().eq("employee_id", FATIMA).eq("work_date", today);
    const checkIn12hAgo = new Date(Date.now() - 12 * 3600000).toISOString();
    await admin.from("attendance").insert({ employee_id: FATIMA, work_date: today, check_in_time: checkIn12hAgo, expected_hours: 9 });
    await scanMissedCheckout(admin);
    let alerts = await admin.from("alerts_log").select("*").eq("employee_id", FATIMA).eq("type", "missed_checkout");
    expect(alerts.data!.length).toBe(1);
    await admin.from("attendance").update({ check_out_time: new Date().toISOString() }).eq("employee_id", FATIMA).eq("work_date", today);
    await scanMissedCheckout(admin);
    alerts = await admin.from("alerts_log").select("*").eq("employee_id", FATIMA).eq("type", "missed_checkout");
    expect(alerts.data!.length).toBe(1);
  });

  it("flow 6 — annual over available → unpaid overflow; approve consumes accrued (permanent)", async () => {
    // SHAIZA is permanent; available = accrued-to-date − used.
    await admin.from("leave_requests").delete().eq("employee_id", SHAIZA).like("reason", "INT-TEST%");
    const remaining = (await leaveSummary(admin, SHAIZA)).annualRemaining;
    expect(remaining).toBeGreaterThan(0);

    const { start, end } = weekdayRange(remaining + 4); // request more than available
    const res = await requestLeave(admin, SHAIZA, { type: "annual", start_date: start, end_date: end, reason: "INT-TEST trip" });
    expect(res.overflowOffered).toBe(true);
    expect(res.annualPart).toBe(remaining);
    expect(res.unpaidPart).toBe(4);
    const annualReq = res.requests.find((r: any) => r.type === "annual");
    await decideLeave(admin, annualReq!.id, FOUNDER, { status: "approved" });
    expect(await annualUsedThisYear(admin, SHAIZA)).toBe(remaining);

    await admin.from("leave_requests").delete().eq("employee_id", SHAIZA).like("reason", "INT-TEST%");
  });

  it("rule — annual within 21 days is rejected", async () => {
    const soon = new Date(); soon.setDate(soon.getDate() + 5);
    const day = soon.toISOString().slice(0, 10);
    await expect(
      requestLeave(admin, AREEBA, { type: "annual", start_date: day, end_date: day, reason: "INT-TEST soon" })
    ).rejects.toThrow(/21 days/);
    await admin.from("leave_requests").delete().eq("employee_id", AREEBA).like("reason", "INT-TEST%");
  });

  it("rule — casual capped per month (permanent, 1/month)", async () => {
    await admin.from("leave_requests").delete().eq("employee_id", HAMZA).like("reason", "INT-CAS%");
    const base = new Date(); base.setDate(10);
    const day = (n: number) => { const x = new Date(base); x.setDate(10 + n); return ymd(x); };
    await requestLeave(admin, HAMZA, { type: "casual", start_date: day(0), end_date: day(0), reason: "INT-CAS 1" });
    await expect(
      requestLeave(admin, HAMZA, { type: "casual", start_date: day(2), end_date: day(2), reason: "INT-CAS 2" })
    ).rejects.toThrow(/per month/);
    await admin.from("leave_requests").delete().eq("employee_id", HAMZA).like("reason", "INT-CAS%");
  });

  // NOTE: the daily-summary rules run through the security-definer save_daily_summary() RPC (0028),
  // which reads auth.uid() — so it's exercised as a real signed-in user in scripts/rls-test.mjs, not
  // here (this suite uses the service-role client, which has no auth.uid()).
});
