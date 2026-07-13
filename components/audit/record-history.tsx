import { createClient } from "@/lib/supabase/server";
import { LogsTable } from "@/components/admin/logs-table";
import { buildAuditNameMap } from "@/lib/audit/name-map";
import type { AuditLog } from "@/lib/types";

/** Per-record change timeline. RLS scopes visibility (super-admin all; admin/BD-Lead non-financial;
 *  a BD sees their own CRM records). Renders nothing if the viewer isn't permitted or there's no history. */
export async function RecordHistory({ entity, id, limit = 25 }: { entity: string; id: string; limit?: number }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .eq("entity", entity)
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!data || data.length === 0) return <p className="text-caption text-text-secondary">No history yet.</p>;
  const nameMap = await buildAuditNameMap(supabase, data as any[]);
  return <LogsTable rows={data as unknown as AuditLog[]} nameMap={nameMap} />;
}
