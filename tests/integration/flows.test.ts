import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkIn, checkOut, editCheckout } from "@/lib/services/attendance";
import { requestLeave, decideLeave } from "@/lib/services/leaves";
import { scanMissedCheckin, scanMissedCheckout } from "@/lib/services/crons";
import { companyToday, companyDow } from "@/lib/time";

const SARA = "00000000-0000-0000-0000-000000000012";
const OMAR = "00000000-0000-0000-0000-000000000015";
const ZARA = "00000000-0000-0000-0000-000000000014";
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
  it("flow 1 — check-in idempotency: second call returns first row unchanged", async () => {
    const today = companyToday();
    await admin.from("attendance").delete().eq("employee_id", SARA).eq("work_date", today);

    const first = await checkIn(admin, SARA);
    expect(first.alreadyCheckedIn).toBe(false);
    const firstTime = first.attendance.check_in_time;

    const second = await checkIn(admin, SARA);
    expect(second.alreadyCheckedIn).toBe(true);
    expect(second.attendance.check_in_time).toBe(firstTime);

    const { data } = await admin.from("attendance").select("id").eq("employee_id", SARA).eq("work_date", today);
    expect(data!.length).toBe(1);
  });

  it("flow 2 — checkout with work_log: total_hours computed by trigger, log persisted", async () => {
    const log = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Shipped the payroll module." }] }] };
    const { attendance } = await checkOut(admin, SARA, { workLog: log });
    expect(attendance.check_out_time).toBeTruthy();
    expect(Number(attendance.total_hours)).toBeGreaterThanOrEqual(0);
    expect(attendance.work_log).toEqual(log);
  });

  it("flow 3 — edit checkout: hours recomputed, is_edited true, audit_log written", async () => {
    const today = companyToday();
    const { data: row } = await admin.from("attendance").select("*").eq("employee_id", SARA).eq("work_date", today).single();
    const before = await admin.from("audit_log").select("id", { count: "exact", head: true }).eq("entity", "attendance");

    // move checkout to checkin + 8h exactly
    const newOut = new Date(new Date(row!.check_in_time).getTime() + 8 * 3600000).toISOString();
    const { attendance } = await editCheckout(admin, row!.id, FOUNDER, { check_out_time: newOut, edit_reason: "left early" });
    expect(attendance.is_edited).toBe(true);
    expect(Number(attendance.total_hours)).toBe(8);

    const after = await admin.from("audit_log").select("id", { count: "exact", head: true }).eq("entity", "attendance");
    expect((after.count ?? 0)).toBeGreaterThan(before.count ?? 0);
  });

  it("flow 4 — missed-checkin cron: alert once, email_sent true, not duplicated", async () => {
    const today = companyToday();
    await admin.from("attendance").delete().eq("employee_id", OMAR).eq("work_date", today);
    await admin.from("alerts_log").delete().eq("employee_id", OMAR).eq("type", "missed_checkin");
    // ensure Omar's shift covers today's weekday
    const dow = companyDow();
    await admin.from("shifts").update({ days_of_week: [0, 1, 2, 3, 4, 5, 6] }).eq("employee_id", OMAR);

    const lateNow = new Date();
    lateNow.setHours(23, 0, 0, 0); // well past shift start + buffer

    await scanMissedCheckin(admin, lateNow);
    let alerts = await admin.from("alerts_log").select("*").eq("employee_id", OMAR).eq("type", "missed_checkin");
    expect(alerts.data!.length).toBe(1);
    expect(alerts.data![0].email_sent).toBe(true);

    await scanMissedCheckin(admin, lateNow); // second run — must not duplicate
    alerts = await admin.from("alerts_log").select("*").eq("employee_id", OMAR).eq("type", "missed_checkin");
    expect(alerts.data!.length).toBe(1);

    // restore weekday set
    await admin.from("shifts").update({ days_of_week: [1, 2, 3, 4, 5] }).eq("employee_id", OMAR);
  });

  it("flow 5 — missed-checkout cron: alert created, then none after checkout set", async () => {
    const today = companyToday();
    await admin.from("alerts_log").delete().eq("employee_id", ZARA).eq("type", "missed_checkout");
    await admin.from("attendance").delete().eq("employee_id", ZARA).eq("work_date", today);

    const checkIn12hAgo = new Date(Date.now() - 12 * 3600000).toISOString();
    await admin.from("attendance").insert({
      employee_id: ZARA, work_date: today, check_in_time: checkIn12hAgo, expected_hours: 9,
    });

    await scanMissedCheckout(admin);
    let alerts = await admin.from("alerts_log").select("*").eq("employee_id", ZARA).eq("type", "missed_checkout");
    expect(alerts.data!.length).toBe(1);

    // employee sets checkout → row closed
    await admin.from("attendance").update({ check_out_time: new Date().toISOString() })
      .eq("employee_id", ZARA).eq("work_date", today);

    await scanMissedCheckout(admin);
    alerts = await admin.from("alerts_log").select("*").eq("employee_id", ZARA).eq("type", "missed_checkout");
    expect(alerts.data!.length).toBe(1); // no new alert
  });

  it("flow 6 — leave over balance: overflow → unpaid; approve annual increments annual_used", async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    // remaining annual = 1
    await admin.from("leave_balances").update({ annual_used: 7, annual_total: 8 })
      .eq("employee_id", SARA).eq("year", year).eq("casual_month", month);
    // clear prior test leaves
    await admin.from("leave_requests").delete().eq("employee_id", SARA).like("reason", "INT-TEST%");

    // next Monday..Wednesday (3 working days)
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); // upcoming Monday
    const start = d.toISOString().slice(0, 10);
    const endD = new Date(d); endD.setDate(endD.getDate() + 2);
    const end = endD.toISOString().slice(0, 10);

    const res = await requestLeave(admin, SARA, { type: "annual", start_date: start, end_date: end, reason: "INT-TEST trip" });
    expect(res.overflowOffered).toBe(true);
    expect(res.unpaidPart).toBe(2);
    expect(res.annualPart).toBe(1);

    const annualReq = res.requests.find((r: any) => r.type === "annual");
    await decideLeave(admin, annualReq!.id, FOUNDER, { status: "approved" });

    const { data: bal } = await admin.from("leave_balances").select("annual_used")
      .eq("employee_id", SARA).eq("year", year).eq("casual_month", month).single();
    expect(bal!.annual_used).toBe(8); // 7 + annualPart(1)

    // cleanup
    await admin.from("leave_requests").delete().eq("employee_id", SARA).like("reason", "INT-TEST%");
    await admin.from("leave_balances").update({ annual_used: 0 })
      .eq("employee_id", SARA).eq("year", year).eq("casual_month", month);
  });
});
