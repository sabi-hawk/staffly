-- 0078_google_oauth_tokens.sql — per-user Google OAuth tokens, so a BD can connect their Google account
-- once and the server can create Calendar events (with Drive-hosted attachments) on their behalf.
--
-- SECURITY: refresh/access tokens are sensitive. RLS is enabled with NO client policies — the table is
-- reachable ONLY by the service role (the OAuth callback + calendar routes). The UI never queries it
-- directly; a server component/route reads just `google_email` via the admin client to show the
-- "Connected as …" state. Never expose tokens to the browser.
create table if not exists google_oauth_tokens (
  profile_id     uuid primary key references profiles(id) on delete cascade,
  google_email   text,                       -- the connected Google account (shown as "Connected as …")
  access_token   text,
  refresh_token  text,                       -- long-lived; used to mint fresh access tokens
  token_expiry   timestamptz,                -- when access_token expires (refresh before this)
  scope          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists trg_google_tokens_updated on google_oauth_tokens;
create trigger trg_google_tokens_updated before update on google_oauth_tokens
  for each row execute function set_updated_at();

alter table google_oauth_tokens enable row level security;
-- No client policies on purpose: only the service role touches this table (OAuth callback + calendar
-- creation routes). Deny-all to authenticated/anon keeps refresh tokens off the client entirely.
