import { createClient } from "@supabase/supabase-js";

/** Server-only client using the SERVICE ROLE key. Bypasses RLS — never import in client code. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
