import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// Add a single hunted job post (all fields optional — a row may be just a URL or just a company).
export async function POST(req: Request) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermP(me, PERM.crmAccess)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const row = {
    owner_bd_id: me.id,
    company: clean(body.company),
    position: clean(body.position),
    job_post_url: clean(body.job_post_url),
    stack_id: body.stack_id || null,
    feedback: clean(body.feedback),
  };
  const { data, error } = await createClient().from("job_hunts").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
