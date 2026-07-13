// Resolve UUID references in audit snapshots to human names (owner BD, closer, working developer,
// profile, etc.) so the history reads "Ali Ahmad" instead of "…024". Server-side (needs the DB).
import type { SupabaseClient } from "@supabase/supabase-js";
import { collectUuids } from "@/lib/audit/labels";

/** Build a { uuid → display name } map for every UUID appearing in these audit rows' before/after. */
export async function buildAuditNameMap(
  supabase: SupabaseClient,
  rows: { before?: unknown; after?: unknown }[]
): Promise<Record<string, string>> {
  const ids = collectUuids(rows);
  if (ids.length === 0) return {};
  const map: Record<string, string> = {};
  // people (owner BD, closer, working developer, generated_by, actor, etc.) and dev-profiles.
  const [{ data: people }, { data: profiles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", ids),
    supabase.from("dev_profiles").select("id, name").in("id", ids),
  ]);
  for (const p of people ?? []) if (p.full_name) map[p.id] = p.full_name;
  for (const p of profiles ?? []) if (p.name && !map[p.id]) map[p.id] = p.name;
  return map;
}
