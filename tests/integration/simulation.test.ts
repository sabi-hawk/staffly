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

    const runs = await generatePayroll(admin, { from, to, generatedBy: FOUNDER });
    const run = runs.find((r: any) => r.employee_id === MUZAMMAL);
    expect(run).toBeTruthy();

    // base 150,000; recurring Internet Allowance 3,000; no unpaid → net 153,000
    expect(Number(run.base_salary)).toBe(150000);
    expect(Number(run.additions_total)).toBe(3000);
    expect(Number(run.deductions)).toBe(0);
    expect(Number(run.net_pay)).toBe(153000);

    // payslip line items created (base + addition)
    const { data: lines } = await admin.from("payslip_components").select("*").eq("payroll_run_id", run.id);
    expect((lines ?? []).some((l) => l.kind === "base")).toBe(true);
    expect((lines ?? []).some((l) => l.kind === "addition")).toBe(true);

    const finalised = await finalisePayroll(admin, run.id);
    expect(finalised.status).toBe("finalised");
    expect(finalised.finalised_at).toBeTruthy();
  });
});
