// Pure hours math (PRD §6.3, §10). Mirrors the DB trigger compute_attendance_hours so the
// app and database can never drift. NON-NETTING RULE: extra hours on one day NEVER reduce a
// deficit on another day — deficit and extra are computed independently per day and summed gross.

export interface DayHours {
  /** worked hours (checkout − checkin), 2dp */
  total: number;
  /** expected hours for the day (shift end − shift start) */
  expected: number;
  /** max(expected − total, 0) */
  deficit: number;
  /** max(total − expected, 0) */
  extra: number;
}

/** Round to 2 decimals the same way Postgres round(x, 2) does. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Hours between two instants. */
export function hoursBetween(checkIn: Date | string, checkOut: Date | string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return round2((b - a) / 3_600_000);
}

/** Shift duration in hours from "HH:MM"/"HH:MM:SS" start & end times. */
export function shiftDurationHours(startTime: string, endTime: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  return round2((toMin(endTime) - toMin(startTime)) / 60);
}

/**
 * Compute a single day's hours. `expected` is the snapshot of shift duration that day.
 * Returns total/deficit/extra. deficit and extra are independent (never net against each other).
 */
export function computeDayHours(
  checkIn: Date | string,
  checkOut: Date | string,
  expected: number
): DayHours {
  const total = hoursBetween(checkIn, checkOut);
  const deficit = round2(Math.max(expected - total, 0));
  const extra = round2(Math.max(total - expected, 0));
  return { total, expected, deficit, extra };
}

export interface PeriodTotals {
  totalHours: number;
  totalExtra: number;
  totalDeficit: number;
  daysPresent: number;
}

/**
 * Aggregate many days into GROSS totals. Critically, totalExtra and totalDeficit are
 * summed separately so a surplus day cannot cancel a short day (the non-netting rule).
 */
export function summarisePeriod(days: DayHours[]): PeriodTotals {
  const t = days.reduce(
    (acc, d) => {
      acc.totalHours += d.total;
      acc.totalExtra += d.extra;
      acc.totalDeficit += d.deficit;
      acc.daysPresent += 1;
      return acc;
    },
    { totalHours: 0, totalExtra: 0, totalDeficit: 0, daysPresent: 0 }
  );
  return {
    totalHours: round2(t.totalHours),
    totalExtra: round2(t.totalExtra),
    totalDeficit: round2(t.totalDeficit),
    daysPresent: t.daysPresent,
  };
}

/** Is a check-in late given shift start + grace buffer (minutes)? */
export function isLate(
  checkIn: Date | string,
  shiftStart: string,
  bufferMinutes: number,
  workDate: Date | string
): boolean {
  const d = new Date(workDate);
  const [h, m] = shiftStart.split(":").map(Number);
  const threshold = new Date(d);
  threshold.setHours(h, (m || 0) + bufferMinutes, 0, 0);
  return new Date(checkIn).getTime() > threshold.getTime();
}
