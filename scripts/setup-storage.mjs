// Creates the public "avatars" storage bucket (idempotent) and verifies upload + public URL.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

loadEnv();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "avatars";

async function main() {
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: "4MB",
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    });
    if (error) throw new Error("createBucket: " + error.message);
    console.log(`Created public bucket "${BUCKET}".`);
  } else {
    await admin.storage.updateBucket(BUCKET, { public: true, fileSizeLimit: "4MB" });
    console.log(`Bucket "${BUCKET}" already exists (ensured public).`);
  }

  // 1x1 transparent PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  const path = "_healthcheck.png";
  const up = await admin.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: true });
  if (up.error) throw new Error("upload: " + up.error.message);
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const res = await fetch(pub.publicUrl);
  console.log(`Healthcheck upload public URL → HTTP ${res.status}`);
  await admin.storage.from(BUCKET).remove([path]);
  console.log("Storage verified ✅");
}

main().catch((e) => { console.error(e); process.exit(1); });
