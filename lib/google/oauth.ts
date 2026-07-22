// Google OAuth 2.0 (Authorization Code flow) — hand-rolled with fetch, no SDK dependency. Used to let a
// BD connect their Google account so we can create Calendar events (with Drive-hosted attachments) on
// their behalf. Server-only: reads GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET.
//
// Feature flag GOOGLE_CALENDAR_API_ENABLED (safe polarity): when TRUE the app offers the API path
// (connect + create with attachments); when absent/false the interview button stays the one-click
// "Add to Google Calendar" URL (the default that needs no setup). A missing env therefore never
// silently switches to the API that requires a per-user connection.
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

// Matches the scopes configured on the OAuth consent screen (Calendar + Drive.file) plus identity.
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.file",
];

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
};

export function googleConfigured(): boolean {
  return !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET;
}

export function calendarApiEnabled(): boolean {
  return googleConfigured() && /^(1|true|on|yes)$/i.test(process.env.GOOGLE_CALENDAR_API_ENABLED ?? "");
}

// The redirect URI must exactly match one registered in the Google console. We derive it from the
// request origin so localhost and production each use their own registered callback.
export function googleRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/api/auth/google/callback`;
}

export function googleAuthUrl({ origin, state }: { origin: string; state: string }): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: googleRedirectUri(origin),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",        // ask for a refresh_token (long-lived)
    prompt: "consent",             // force the refresh_token even on re-consent
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens({ code, origin }: { code: string; origin: string }): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// Exchange a stored refresh_token for a fresh access_token (Google omits refresh_token in this response).
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(USERINFO_ENDPOINT, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const j = (await res.json()) as { email?: string };
  return j.email ?? null;
}
