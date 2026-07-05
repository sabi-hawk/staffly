// Shared date helpers for the CRM grids' received/updated date-range filters. Asia/Karachi (UTC+5,
// no DST), so a fixed +5h offset is exact. Plain module — safe to import from both server grids and
// the client date-filter (avoids the three copy-pasted isoAgo/daysAgo implementations).

/** YYYY-MM-DD for `days` before today, in Asia/Karachi. */
export function crmDaysAgo(days: number): string {
  const d = new Date(Date.now() + 5 * 3600_000);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD for today, in Asia/Karachi. */
export function crmToday(): string {
  return new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
}
