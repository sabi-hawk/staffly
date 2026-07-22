// Shared Job Hunt Board (0076) service helpers: retention/cleanup + the per-BD "jobs hunted" daily
// counts used by the daily summary and admin attendance report.
import type { SupabaseClient } from "@supabase/supabase-js";
import { companyToday } from "@/lib/time";

const JOB_HUNT_RETENTION_DAYS = 10;

/**
 * Snapshot every BD's per-day hunted count, then delete board rows older than the retention window.
 * Runs the idempotent `purge_job_hunts` RPC (snapshot preserves counts, so purged days keep totals).
 * Called by the guarded daily cron with the service-role (admin) client. Returns rows purged.
 */
export async function purgeJobHunts(
  admin: SupabaseClient,
  retentionDays: number = JOB_HUNT_RETENTION_DAYS
): Promise<{ purged: number }> {
  const { data, error } = await admin.rpc("purge_job_hunts", { retention_days: retentionDays });
  if (error) throw new Error(`purge_job_hunts: ${error.message}`);
  return { purged: Number(data) || 0 };
}

/**
 * Jobs HUNTED per (BD, Karachi-day) across a date range, keyed `${owner_bd_id}|${day}`.
 * Merges the LIVE board (recent days, within retention) with the persisted daily-count snapshot
 * (older days whose rows were purged) — live wins when both exist so today's count is always current.
 */
export async function huntedCountsForRange(
  supabase: SupabaseClient,
  ownerIds: string[],
  from: string,
  to: string
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (ownerIds.length === 0) return out;

  // Persisted snapshot first (authoritative for purged days) …
  const { data: snap } = await supabase
    .from("job_hunt_daily_counts")
    .select("owner_bd_id, day, count")
    .in("owner_bd_id", ownerIds)
    .gte("day", from)
    .lte("day", to);
  for (const s of (snap ?? []) as { owner_bd_id: string; day: string; count: number }[]) {
    out[`${s.owner_bd_id}|${s.day}`] = Number(s.count) || 0;
  }

  // … then live rows, which override the snapshot for any day still on the board.
  const { data: live } = await supabase
    .from("job_hunts")
    .select("owner_bd_id, created_at")
    .in("owner_bd_id", ownerIds)
    .gte("created_at", `${from}T00:00:00+05:00`)
    .lte("created_at", `${to}T23:59:59.999+05:00`);
  const liveCounts: Record<string, number> = {};
  for (const h of (live ?? []) as { owner_bd_id: string; created_at: string }[]) {
    const key = `${h.owner_bd_id}|${companyToday(new Date(h.created_at))}`;
    liveCounts[key] = (liveCounts[key] ?? 0) + 1;
  }
  for (const [key, n] of Object.entries(liveCounts)) out[key] = n;

  return out;
}
