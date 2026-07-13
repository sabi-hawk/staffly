// Timezone helpers. Company timezone is Asia/Karachi (PRD §18.1). Storage is UTC.
export const COMPANY_TZ = "Asia/Karachi";

/** Today's date (YYYY-MM-DD) in the company timezone. */
export function companyToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COMPANY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Calendar-month bounds as plain company-local date strings. `month` is 1-12. Timezone-safe (never
 * uses toISOString, which would shift the 1st/last day across the UTC boundary on a +hours runtime). */
export function monthBounds(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate(); // day 0 of next month = last day of this
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

/** Month names for pickers (index 0 = January). */
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Karachi-midnight of a YYYY-MM-DD date, as a UTC ISO instant (Karachi has no DST, +05:00). */
export function karachiMidnightISO(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00+05:00`).toISOString();
}

/** Start of the current company day, as a UTC ISO instant — for de-duping "once per day" alerts. */
export function companyDayStartISO(now: Date = new Date()): string {
  return karachiMidnightISO(companyToday(now));
}

/** Day of week (0=Sun..6=Sat) in the company timezone. */
export function companyDow(date: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: COMPANY_TZ, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

export type RangeKey = "week" | "month" | "3w" | "1m" | "3m" | "custom";
export const RANGE_LABELS: Record<RangeKey, string> = {
  week: "This week",
  month: "This month",
  "3w": "Last 3 weeks",
  "1m": "Last month",
  "3m": "Last 3 months",
  custom: "Custom",
};

function isoDaysAgo(days: number): string {
  // Anchor to Karachi-midnight today, then step back `days`, and format back in Karachi — so the
  // `from` boundary doesn't slip a day during the 00:00–04:59 UTC window.
  const d = new Date(`${companyToday()}T00:00:00+05:00`);
  d.setUTCDate(d.getUTCDate() - days);
  return companyToday(d);
}

/** Resolve a {from,to} window (YYYY-MM-DD) from a range key + optional custom dates. */
export function resolveRange(
  range: RangeKey | undefined,
  customFrom?: string,
  customTo?: string
): { from: string; to: string; range: RangeKey } {
  const today = companyToday();
  const r: RangeKey = range ?? "1m";
  if (r === "custom") {
    return { from: customFrom || isoDaysAgo(30), to: customTo || today, range: "custom" };
  }
  if (r === "week") {
    // This week: Monday → today (company timezone).
    const d = new Date(`${today}T00:00:00+05:00`);
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0
    d.setUTCDate(d.getUTCDate() - dow);
    return { from: companyToday(d), to: today, range: "week" };
  }
  if (r === "month") {
    // Current calendar month, 1st → today (company timezone).
    return { from: `${today.slice(0, 7)}-01`, to: today, range: "month" };
  }
  const days = r === "3w" ? 21 : r === "3m" ? 90 : 30;
  return { from: isoDaysAgo(days), to: today, range: r };
}
