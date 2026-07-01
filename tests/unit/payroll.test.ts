import { describe, it, expect } from "vitest";
import { computePayroll, computeDeductions, benefitsTotal } from "@/lib/payroll";

describe("§14.2 payroll — pure logic", () => {
  it("Fixed payroll: base 180k, no OT → net = base + benefits − ded", () => {
    const r = computePayroll({
      salaryType: "fixed",
      baseSalary: 180000,
      benefits: [],
      workingDays: 22,
      unpaidDays: 0,
    });
    expect(r.netPay).toBe(180000);
    expect(r.overtimePay).toBe(0);
  });

  it("OT payroll: base 200k, extra 2h @800 → net = base + 1600 + benefits (Ali = 211,600)", () => {
    const r = computePayroll({
      salaryType: "fixed_plus_overtime",
      baseSalary: 200000,
      overtimeRateHour: 800,
      totalExtraHours: 2,
      benefits: [{ label: "Medical", amount: 10000 }],
      workingDays: 22,
      unpaidDays: 0,
    });
    expect(r.overtimePay).toBe(1600);
    expect(r.benefitsTotal).toBe(10000);
    expect(r.netPay).toBe(211600);
  });

  it("Commission-only (base 0): net = commission + benefits, no base deduction", () => {
    const r = computePayroll({
      salaryType: "commission",
      baseSalary: 0,
      commissionAmount: 45000,
      benefits: [{ label: "Medical", amount: 5000 }],
      workingDays: 22,
      unpaidDays: 3, // daily rate = 0/22 = 0, so unpaid days deduct nothing
    });
    expect(r.baseSalary).toBe(0);
    expect(r.deductions).toBe(0);
    expect(r.netPay).toBe(50000);
  });

  it("Commission: base 60k, comm 45k → net = 105k + benefits − ded", () => {
    const r = computePayroll({
      salaryType: "commission",
      baseSalary: 60000,
      commissionAmount: 45000,
      benefits: [],
      workingDays: 22,
      unpaidDays: 0,
    });
    expect(r.commissionAmount).toBe(45000);
    expect(r.netPay).toBe(105000);
  });

  it("Unpaid deduction: 1 unpaid, 22 working days, base 60k → ≈ 2,727", () => {
    expect(computeDeductions(60000, 22, 1)).toBeCloseTo(2727.27, 1);
  });

  it("Bilal worked example (commission): base 60k + comm 45k + transport 8k − 2,727 ded = 110,273", () => {
    const r = computePayroll({
      salaryType: "commission",
      baseSalary: 60000,
      commissionAmount: 45000,
      benefits: [{ label: "Transport", amount: 8000 }],
      workingDays: 22,
      unpaidDays: 1,
    });
    expect(r.deductions).toBeCloseTo(2727.27, 1);
    expect(r.netPay).toBeCloseTo(110272.73, 1);
  });

  it("Deficit hours never auto-deduct (only unpaid days do)", () => {
    const r = computePayroll({
      salaryType: "fixed",
      baseSalary: 100000,
      benefits: [],
      workingDays: 20,
      unpaidDays: 0,
    });
    expect(r.deductions).toBe(0);
  });

  it("benefitsTotal sums amounts", () => {
    expect(benefitsTotal([{ label: "A", amount: 1000 }, { label: "B", amount: 500 }])).toBe(1500);
  });
});
