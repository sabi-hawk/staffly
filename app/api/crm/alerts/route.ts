import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

const isAdmin = (role?: string) => role === "admin" || role === "super_admin";

// GET — admin/super only: CRM alerts from the last 30 days + unread count (RLS also enforces).
export async function GET() {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  // list = most-recent 50 for display; unread = an exact count over the whole window (not capped at 50).
  const [listRes, countRes] = await Promise.all([
    supabase
      .from("crm_alerts")
      .select("id, type, company, message, created_at, read_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("crm_alerts")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .gte("created_at", since),
  ]);
  if (listRes.error) return NextResponse.json({ error: listRes.error.message }, { status: 400 });
  return NextResponse.json({ alerts: listRes.data ?? [], unread: countRes.count ?? 0 });
}

// POST — mark all unread alerts as read (called when the admin opens the bell).
export async function POST() {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(me.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { error } = await supabase
    .from("crm_alerts")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .gte("created_at", since); // only the alerts the admin can actually see (30-day window)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
