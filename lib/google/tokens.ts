// Persistence + retrieval of a user's Google OAuth tokens. Service-role only (RLS denies clients).
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken, type GoogleTokenResponse } from "@/lib/google/oauth";

// A refresh_token is only returned on the FIRST consent (prompt=consent forces it). On a re-connect
// Google may omit it, so we keep the existing one rather than nulling it.
export async function saveGoogleTokens(profileId: string, tok: GoogleTokenResponse, email: string | null) {
  const admin = createAdminClient();
  const expiry = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  const row: Record<string, unknown> = {
    profile_id: profileId,
    google_email: email,
    access_token: tok.access_token,
    token_expiry: expiry,
    scope: tok.scope,
  };
  if (tok.refresh_token) row.refresh_token = tok.refresh_token;
  const { error } = await admin.from("google_oauth_tokens").upsert(row, { onConflict: "profile_id" });
  if (error) throw new Error(`Saving Google tokens: ${error.message}`);
}

export async function getGoogleConnection(profileId: string): Promise<{ email: string | null } | null> {
  const { data } = await createAdminClient()
    .from("google_oauth_tokens")
    .select("google_email, refresh_token")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data || !data.refresh_token) return null; // not usable without a refresh token
  return { email: data.google_email ?? null };
}

export async function deleteGoogleConnection(profileId: string) {
  await createAdminClient().from("google_oauth_tokens").delete().eq("profile_id", profileId);
}

// Return a valid access token for the user, refreshing (and persisting) it if it's expired/near-expiry.
// Used by the Calendar/Drive routes (next phase). Returns null if the user hasn't connected.
export async function getValidAccessToken(profileId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_oauth_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data?.refresh_token) return null;

  const stillValid = data.access_token && data.token_expiry && new Date(data.token_expiry).getTime() - Date.now() > 60_000;
  if (stillValid) return data.access_token as string;

  const refreshed = await refreshAccessToken(data.refresh_token as string);
  await admin
    .from("google_oauth_tokens")
    .update({
      access_token: refreshed.access_token,
      token_expiry: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
      scope: refreshed.scope,
    })
    .eq("profile_id", profileId);
  return refreshed.access_token;
}
