// BD daily job-application counts (0050). A BD logs, per dev profile they OWN, how many jobs they
// applied to that day. Writes go through the security-definer save_job_counts RPC (ownership-checked).
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileCount = {
  dev_profile_id: string;
  profile_no: number | null;
  name: string;
  stack: string | null;
  label: string;
  count: number;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The caller's OWN active profiles, each with the job count already logged for `workDate` (0 if none). */
export async function myProfilesWithCounts(
  supabase: SupabaseClient,
  ownerId: string,
  workDate: string
): Promise<ProfileCount[]> {
  const [{ data: profiles }, { data: counts }] = await Promise.all([
    supabase
      .from("dev_profiles")
      .select("id, profile_no, name, stack:dev_stacks(name)")
      .eq("owner_bd_id", ownerId)
      .eq("status", "active")
      .order("profile_no", { ascending: true, nullsFirst: false }),
    supabase
      .from("bd_job_applications")
      .select("dev_profile_id, count")
      .eq("owner_bd_id", ownerId)
      .eq("work_date", workDate),
  ]);
  const byProfile = new Map<string, number>((counts ?? []).map((c: any) => [c.dev_profile_id, Number(c.count) || 0]));
  return ((profiles ?? []) as any[]).map((p) => {
    const stack = p.stack?.name ?? null;
    return {
      dev_profile_id: p.id,
      profile_no: p.profile_no ?? null,
      name: p.name,
      stack,
      label: `#${p.profile_no} ${p.name}${stack ? ` · ${stack}` : ""}`,
      count: byProfile.get(p.id) ?? 0,
    };
  });
}

/** Upsert the caller's per-profile counts for a work day via the definer RPC. Returns rows saved. */
export async function saveJobCounts(
  supabase: SupabaseClient,
  workDate: string,
  counts: { dev_profile_id: string; count: number }[]
): Promise<number> {
  const { data, error } = await supabase.rpc("save_job_counts", { p_work_date: workDate, p_counts: counts });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}
