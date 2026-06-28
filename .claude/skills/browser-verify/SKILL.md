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

## Standard smoke
`npm run test:e2e` runs `tests/e2e/*.spec.ts` (login + role gating + key admin/employee screens),
writing screenshots to `test-artifacts/`. Then **Read** the PNGs to confirm rendering.

## Ad-hoc flow check (recommended for a specific change)
Start the dev server, then run a short Playwright script that logs in and screenshots the screen you
changed. Pattern:
1. `npm run dev` (background) and wait for "Ready".
2. A throwaway `.mjs` using `import { chromium } from "@playwright/test"` that:
   - logs in (admin by email `super.admin@softonoma.com`; employee by username, e.g. `test.employee` / `Softonoma@9999` — see `CREDENTIALS.md`),
   - navigates to the page, performs the action, `page.screenshot({ path: "test-artifacts/<name>.png", fullPage: true })`.
3. **Read** the screenshot(s). Clean up any data the script created (delete test rows/users).

## Tips
- Login field label is **"Username or email"**; password **"Password"**; submit button **"Sign in"**.
- Our shared `Label` isn't always `htmlFor`-linked, so prefer locating inputs by order/placeholder or `form input` nth, not always `getByLabel`.
- After a mutation, wait briefly (router.refresh re-renders server components) before screenshotting.
- Never leave test artifacts in the cloud DB — delete what you create (`test-artifacts/` is git-ignored).
