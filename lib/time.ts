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
