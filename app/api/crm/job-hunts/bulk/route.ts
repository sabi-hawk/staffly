import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";

// Bulk-add hunted URLs — paste many links (one per line) in one go. De-dupes within the paste AND against
// URLs already on the board, so only NEW unique links become rows (company/position/stack left empty).
export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.crmAccess)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const raw: string[] = Array.isArray(body.urls) ? body.urls : String(body.text ?? "").split(/[\r\n]+/);

  // normalise + de-dupe within the paste (case-insensitive on the trimmed URL)
  const seen = new Set<string>();
  const unique: string[] = [];
  let dupInPaste = 0;
  for (const u of raw) {
    const url = (u ?? "").trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) { dupInPaste++; continue; }
    seen.add(key);
    unique.push(url);
  }
  if (unique.length === 0) return NextResponse.json({ added: 0, dupInPaste, alreadyOnBoard: 0 });

  const supabase = createClient();
  // which of these are already on the board (any BD)?
  const { data: existing } = await supabase.from("job_hunts").select("job_post_url").not("job_post_url", "is", null);
  const onBoard = new Set((existing ?? []).map((r: any) => String(r.job_post_url).trim().toLowerCase()));
  const fresh = unique.filter((u) => !onBoard.has(u.toLowerCase()));
  const alreadyOnBoard = unique.length - fresh.length;

  if (fresh.length) {
    const rows = fresh.map((url) => ({ owner_bd_id: me.id, job_post_url: url }));
    const { error } = await supabase.from("job_hunts").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ added: fresh.length, dupInPaste, alreadyOnBoard });
}
