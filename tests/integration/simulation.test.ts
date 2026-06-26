import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generatePayroll, finalisePayroll } from "@/lib/services/payroll";

const ALI = "00000000-0000-0000-0000-000000000011";
const FOUNDER = "00000000-0000-0000-0000-000000000001";

let admin: SupabaseClient;
beforeAll(() => {
  admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
});

describe("§14.5 E2E-4 (data) — super-admin payroll run incl. overtime → finalise", () => {
  it("generates Ali's run with overtime pay from seeded extra hours, then finalises", async () => {
    const today = new Date();
    const from = new Date(today.getTime() - 9 * 86400000).toISOString().slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    const runs = await generatePayroll(admin, { from, to, generatedBy: FOUNDER });
    const ali = runs.find((r: any) => r.employee_id === ALI);
    expect(ali).toBeTruthy();

    // seeded canonical: Ali has exactly one overtime day of +2h; OT rate 800 ⇒ 1600
    expect(Number(ali.total_extra_hours)).toBe(2);
    expect(Number(ali.overtime_pay)).toBe(1600);
    // net = base 200000 + OT 1600 + benefits 10000 − 0 = 211600
    expect(Number(ali.base_salary)).toBe(200000);
    expect(Number(ali.benefits_total)).toBe(10000);
    expect(Number(ali.net_pay)).toBe(211600);

    const finalised = await finalisePayroll(admin, ali.id);
    expect(finalised.status).toBe("finalised");
    expect(finalised.finalised_at).toBeTruthy();
  });
});
