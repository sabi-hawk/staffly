# Backlog — deferred items to re-enable later

## Scheduled attendance alert emails (missed check-in / missed check-out)
**Status:** disabled 2026-07-08 to deploy on **Vercel Hobby** (Hobby allows only *daily* crons; our
scans need ~every-15-min). No functionality lost — see below.

**What it did:** two crons (`*/15 * * * *`) hit `/api/cron/missed-checkin` and `/api/cron/missed-checkout`
(`vercel.json`). They scan shifts/attendance and, for anyone who missed check-in (shift start + buffer,
not on leave) or is overdue on checkout (past expected-out + grace), write an `alerts_log` row and email
the employee + admin. Emails are **console-stubbed** unless `RESEND_API_KEY` is set, so nothing was
actually emailing yet.

**What replaced it (already live, no cron):** the admin dashboard computes **missed check-in / overdue
checkout LIVE on load** — "Attendance alerts · live" card + the per-employee Live-status table. The
still-open session also shows the employee a **Stop & correct** warning. So the admin sees who hasn't
checked in / is still checked out the moment they open the dashboard; only the *push email* is off.
The read-only helpers `findMissedCheckin` / `findMissedCheckout` (`lib/services/crons.ts`) power this and
are reused by the cron scanners, so behaviour stays identical if re-enabled.

### To re-enable the scheduled email alerts (pick one)
The `/api/cron/missed-checkin` + `/api/cron/missed-checkout` routes still exist and are guarded by
`isAuthorizedCron` (Bearer `CRON_SECRET`). Also set `RESEND_API_KEY` (+ `ADMIN_ALERT_EMAIL`, `APP_URL`)
so emails actually send.

1. **Supabase `pg_cron` + `pg_net` (FREE — recommended).** Supabase includes `pg_cron` and `pg_net` on
   all tiers, so no Vercel Pro needed. After deploy, in the Supabase SQL editor:
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   -- every 15 min, call the deployed routes with the shared secret
   select cron.schedule('missed-checkin', '*/15 * * * *', $$
     select net.http_get(
       url := 'https://<your-app>.vercel.app/api/cron/missed-checkin',
       headers := jsonb_build_object('Authorization', 'Bearer ' || '<CRON_SECRET>'));
   $$);
   select cron.schedule('missed-checkout', '*/15 * * * *', $$
     select net.http_get(
       url := 'https://<your-app>.vercel.app/api/cron/missed-checkout',
       headers := jsonb_build_object('Authorization', 'Bearer ' || '<CRON_SECRET>'));
   $$);
   ```
   Keeps all the JS logic + email sending; runs every 15 min for free. (Store the secret via a Vault
   entry rather than inline if you prefer.)
2. **External free scheduler** (cron-job.org, GitHub Actions) hitting the two routes with the Bearer.
3. **Vercel Pro** — restore the two entries in `vercel.json` (`*/15 * * * *`).
