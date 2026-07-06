import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generatePayroll, finalisePayroll } from "@/lib/services/payroll";

const MUZAMMAL = "00000000-0000-0000-0000-000000000026";
const FOUNDER = "00000000-0000-0000-0000-000000000001";

let admin: SupabaseClient;
beforeAll(() => {
  admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
});

describe("§14.5 E2E-4 (data) — payroll with dynamic additions → finalise", () => {
  it("generates Muzammal's run (base + recurring additions) and finalises", async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    // Reset any run left finalised by a prior test run — generate must not un-finalise a locked run
    // (0019 data-loss guard), so this test starts from a clean slate to exercise fresh generation.
    await admin.from("payroll_runs").delete()
      .eq("employee_id", MUZAMMAL).eq("period_start", from).eq("period_end", to);

    const runs = await generatePayroll(admin, { from, to, generatedBy: FOUNDER });
    const run = runs.find((r: any) => r.employee_id === MUZAMMAL);
    expect(run).toBeTruthy();

    // base 150,000; no recurring additions (his bonus is conditional/non-recurring); no unpaid leave.
    // Since the missing-day rule (2026-07-06), past scheduled days without attendance/leave deduct at
    // base/working-days each with a "Missing record" justification — canonical seed covers only the
    // last ~5 days, so deductions are usually > 0 and must reconcile exactly.
    expect(Number(run.base_salary)).toBe(150000);
    expect(Number(run.additions_total)).toBe(0);
    expect(Number(run.net_pay)).toBe(Math.round((150000 - Number(run.deductions)) * 100) / 100);

    // payslip lines: base always; any deduction must carry its justification
    const { data: lines } = await admin.from("payslip_components").select("*").eq("payroll_run_id", run.id);
    expect((lines ?? []).some((l) => l.kind === "base")).toBe(true);
    const dedLines = (lines ?? []).filter((l) => l.kind === "deduction");
    const dedSum = dedLines.reduce((s, l) => s + Number(l.amount), 0);
    expect(Math.round(dedSum * 100) / 100).toBe(Number(run.deductions));
    if (Number(run.deductions) > 0) {
      const missing = dedLines.find((l) => l.label === "Missing attendance deduction");
      expect(missing?.description).toMatch(/Missing record/);
    }

    const finalised = await finalisePayroll(admin, run.id);
    expect(finalised.status).toBe("finalised");
    expect(finalised.finalised_at).toBeTruthy();
  });
});
