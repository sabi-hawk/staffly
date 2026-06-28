import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024;
const BUCKET = "avatars";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const targetId = (form.get("employeeId") as string) || user.id;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(targetId)) return NextResponse.json({ error: "Invalid employee id" }, { status: 400 });
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Use PNG, JPEG or WebP" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Max 4MB" }, { status: 400 });

  // employees may only upload their own avatar; admins may upload for anyone
  if (targetId !== user.id) {
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!me || me.role === "employee") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `${targetId}.${ext}`;

  // Upload to Supabase Storage (works on serverless; replaces local-disk writes).
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(objectPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
  const url = `${pub.publicUrl}?t=${Date.now()}`; // cache-bust on re-upload

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", targetId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ avatar_url: url });
}
