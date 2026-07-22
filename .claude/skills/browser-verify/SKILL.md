---
name: browser-verify
description: Verify UI changes in a real browser using Playwright headless + screenshots that the agent can read back. Use after any UI change, or to confirm a flow (login, check-in/out, payroll, etc.) actually works — not just that tests pass.
---

# Browser Verify

There is no in-IDE clickable browser here, so we drive a **headless browser and screenshot**, then
**read the PNGs** to confirm the UI. This is our manual-QA substitute and it has caught real bugs
(0-row grids from an RSC import, the broken alerts feed, the workLogPreview crash).

## One-time
`npx playwright install chromium` (Chromium binary; `@playwright/test` is already a dev dep).

## ALWAYS FIRST: make login deterministic — `npm run e2e:auth`
The #1 thing that used to block browser-verify was **"Invalid username or password"** at the login
step — a demo account's password had drifted from the hard-coded quick-login creds
(`app/login/page.tsx`). **Do not fix this by reseeding** (`seed:test` wipes the owner's live dev data).
Instead run **`npm run e2e:auth`**: it resets ONLY the demo accounts' passwords via the service-role
admin API (never touches profiles/CRM/attendance), verifies each with a real sign-in, and refuses to
run against production. Run it before every browser-verify pass — it's idempotent and self-healing.

If login still fails after `e2e:auth`, the cause is the **dev server being down**, not creds — see the
two server modes below.

## Standard smoke
`npm run test:e2e` runs `tests/e2e/*.spec.ts` (login + role gating + key admin/employee/CRM screens),
writing screenshots to `test-artifacts/`. Then **Read** the PNGs to confirm rendering. Specs share
`tests/e2e/_helpers.ts` (`login`, `DEMO`, `SHOT`) — reuse it, don't re-implement login.

**Playwright starts/reuses the server for you** (`playwright.config.ts` `webServer.reuseExistingServer`):
if the owner's `npm run dev` is on :3000 it reuses it; otherwise it launches `next dev` on `PW_PORT`.
Reusing the running dev server for **read/screenshot** is safe — cache corruption only comes from
`build`, never from hitting a running dev server.

## New UI/CRM feature → ship a spec
Owner-mandated (2026-07-22): a new CRM/UI module or a materially changed flow ships with a
`tests/e2e/*.spec.ts` in the SAME change (e.g. `crm-jobboard.spec.ts` = open board, add a post, assert
render, delete it, + non-BD is blocked). Tests that mutate the shared cloud DB must clean up after
themselves (delete the rows they create).

## Ad-hoc flow check (recommended for a specific change)
Serve a production build from the **isolated** dist dir, then run a short Playwright script that
logs in and screenshots the screen you changed.

> ⚠️ **Never run `npm run build`/`npm start` while the owner's `npm run dev` may be running** — they
> share `.next` and the build corrupts the dev server's cache ("Cannot find module './NNNN.js'",
> unstyled pages, owner has to restart). Always use the `verify:*` scripts, which build into
> `.next-verify`.

Pattern:
1. `npm run verify:build`, then `npm run verify:start -- -p 3100` (background; port 3100 avoids the
   owner's dev server on 3000) and wait for it to answer.
2. A throwaway `.mjs` using `import { chromium } from "@playwright/test"` that:
   - logs in (admin by email `super.admin@softonoma.com`; employee by username, e.g. `test.employee` / `Softonoma@9999` — see `CREDENTIALS.md`),
   - navigates to the page, performs the action, `page.screenshot({ path: "test-artifacts/<name>.png", fullPage: true })`.
3. **Read** the screenshot(s). Clean up any data the script created (delete test rows/users).

## Tips
- Run **`npm run e2e:auth`** first (see above) so login never blocks the pass.
- Login field label is **"Username or email"**; password **"Password"**; submit button **"Sign in"**.
- Our shared `Label` isn't always `htmlFor`-linked, so prefer locating inputs by order/placeholder or `form input` nth, not always `getByLabel`.
- After a mutation, wait briefly (router.refresh re-renders server components) before screenshotting.
- Never leave test artifacts in the cloud DB — delete what you create (`test-artifacts/` is git-ignored).
