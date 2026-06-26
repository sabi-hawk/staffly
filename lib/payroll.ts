// Pure payroll math (PRD §12). Unit-tested in isolation. No I/O.
import { round2 } from "./hours";

export type SalaryType = "fixed" | "fixed_plus_overtime" | "commission";

export interface Benefit {
  label: string;
  amount: number;
}

export interface PayrollInputs {
  salaryType: SalaryType;
  baseSalary: number;
  /** per extra hour, used only for fixed_plus_overtime */
  overtimeRateHour?: number;
  /** gross extra hours in the period (non-netting — never reduced by deficits) */
  totalExtraHours?: number;
  /** commission amount entered by admin (commission type only) */
  commissionAmount?: number;
  benefits?: Benefit[];
  /** working days in the period, used for the daily rate */
  workingDays: number;
  /** unpaid leave days + unexcused absent days */
  unpaidDays?: number;
}

export interface PayrollResult {
  baseSalary: number;
  overtimePay: number;
  commissionAmount: number;
  benefitsTotal: number;
  deductions: number;
  netPay: number;
}

export function benefitsTotal(benefits: Benefit[] = []): number {
  return round2(benefits.reduce((s, b) => s + (Number(b.amount) || 0), 0));
}

/** daily_rate = base_salary / working_days_in_period; deductions = unpaid_days * daily_rate. */
export function computeDeductions(
  baseSalary: number,
  workingDays: number,
  unpaidDays: number
): number {
  if (!workingDays || workingDays <= 0) return 0;
  const dailyRate = baseSalary / workingDays;
  return round2(unpaidDays * dailyRate);
}

/**
 * Compute a payroll run's components & net pay per §12.1.
 *  - fixed:               net = base + benefits − deductions
 *  - fixed_plus_overtime: net = base + extra*rate + benefits − deductions
 *  - commission:          net = base + commission + benefits − deductions
 * Deficit hours are reported elsewhere but NEVER auto-deducted here (founder decides).
 */
export function computePayroll(inp: PayrollInputs): PayrollResult {
  const base = round2(inp.baseSalary || 0);
  const ben = benefitsTotal(inp.benefits);
  const deductions = computeDeductions(base, inp.workingDays, inp.unpaidDays || 0);

  let overtimePay = 0;
  let commissionAmount = 0;

  if (inp.salaryType === "fixed_plus_overtime") {
    overtimePay = round2((inp.totalExtraHours || 0) * (inp.overtimeRateHour || 0));
  } else if (inp.salaryType === "commission") {
    commissionAmount = round2(inp.commissionAmount || 0);
  }

  const netPay = round2(base + overtimePay + commissionAmount + ben - deductions);

  return {
    baseSalary: base,
    overtimePay,
    commissionAmount,
    benefitsTotal: ben,
    deductions,
    netPay,
  };
}
