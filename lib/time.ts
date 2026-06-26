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

/** Day of week (0=Sun..6=Sat) in the company timezone. */
export function companyDow(date: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: COMPANY_TZ, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

export type RangeKey = "3w" | "1m" | "3m" | "custom";
export const RANGE_LABELS: Record<RangeKey, string> = {
  "3w": "Last 3 weeks",
  "1m": "Last month",
  "3m": "Last 3 months",
  custom: "Custom",
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
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
  const days = r === "3w" ? 21 : r === "3m" ? 90 : 30;
  return { from: isoDaysAgo(days), to: today, range: r };
}
