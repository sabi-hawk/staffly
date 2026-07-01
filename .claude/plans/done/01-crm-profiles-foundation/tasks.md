# Tasks — Plan 01: CRM Foundation (Access + Profiles)

Legend: [ ] todo · [~] in progress · [x] done. Notes after each on completion (commit/file/decision).

## Slice A — Access foundation (FRD-05) ✅ (applied; tsc clean)
- [x] `0010_crm_access.sql`: `departments` lookup + seed + backfill; `profiles.department_id`,
  `is_bd_lead`, `is_developer`; guard trigger (block non-admin privileged-column self-edits);
  `auth_department()`, `auth_is_bd()`, `auth_is_bd_lead()`; departments RLS + audit trigger.
  DECISION: `auth_is_bd()` keyed on **text `department`** (single source across all 3 layers; no drift
  vs the one-time `department_id` backfill + re-seed). Lookup + FK kept as forward structure — follow-up
  wires the employee editor/seed to `department_id` then flips the helper to the join.
- [x] `lib/types.ts`: `department_id`, `is_bd_lead`, `is_developer` on `Profile`; `Department` type.
- [x] `lib/crm/access.ts`: `canSeeCrm`, `isBdLead`, `canSeeDeals` (server+client safe).
- [x] `lib/nav.ts`: `navForRole(profile)` → CRM nav for BD + admin (all vs my-profiles).
- [x] `components/layout/app-shell.tsx`: pass profile to nav.
- [x] `lib/supabase/middleware.ts`: gate `/crm/*` (BD-or-admin); `/crm/deals` admin/super only.
- [x] applied migration + `npx tsc --noEmit` clean.
- NOTE: found + noted test pollution on Ahmad Roshan's `department` ("Engineering (audit …)") — a
  re-seed corrects it; underscores why we're moving to the lookup.

## Slice B — Profiles data, storage & UI (FRD-01) ✅
- [x] `0011_crm_profiles.sql`: `dev_stacks` (+seed), `dev_profiles`, `dev_profile_secrets` (NOT audited),
  `dev_profile_documents` (one-primary partial unique index); RLS (admin/super all · BD-Lead all · BD
  owner-scoped · secrets admin+super); audit triggers. Applied.
- [x] Private `crm-docs` bucket (extended `scripts/setup-storage.mjs`) + signed-URL download.
- [x] Upload `POST /api/crm/profiles/[id]/documents`; download `GET /api/crm/documents/[docId]/download`
  (RLS-checked signed URL + download audit); `PATCH/DELETE /api/crm/documents/[docId]`; profile CRUD +
  password routes under `app/api/crm/*`. MIME/size validated.
- [x] `lib/services/dev-profiles.ts`; `lib/crm/access.ts`.
- [x] UI: `app/(app)/crm/profiles` (grid + `[id]` + `new`) — single route, RLS-scoped (no separate
  my-profiles); components `profile-form`, `password-panel`, `documents-panel`.
- [x] `scripts/seed-crm.mjs` (3 demo profiles).
- NOTE: `ENTITIES` filter in the Logs page is a Plan-04 (Activity Log) concern — deferred there.

## Slice C — Tests & verification ✅
- [x] E2E `tests/e2e/crm.spec.ts` (3 pass): admin grid+detail (password/edit/upload); BD own-only, no
  password/edit; non-BD blocked from `/crm`. Screenshots read + confirmed.
- [x] `npm run report` → ALL §14 PASS (unit 14/14, RLS 14/14, integration 10/10, tsc) — no regression.
- [x] `npx tsc --noEmit` clean · `npm run build` green.
- [ ] FOLLOW-UP (not blocking): add CRM cases to the report's RLS suite (`scripts/rls-test.mjs`) so the
  gate itself covers dev_profiles owner-scoping + secrets. E2E covers it durably for now.
- FIX (env): made `playwright.config.ts` port-overridable via `PW_PORT` (port 3000 was taken by another
  local app). Default unchanged.

## Review gate (security + quality agents) ✅
Both agents flagged the SAME blocker; fixed in `0012_crm_fixes.sql` + code:
- [x] **BLOCKER** guard trigger now also guards the text `department` column (was department_id only).
  Verified with a real employee session: self-set department=BD / is_bd_lead → BLOCKED; phone → allowed.
- [x] Upload: magic-byte MIME check (don't trust browser Content-Type) + UUID path validation on all routes.
- [x] Password no longer embedded in the page payload — lazy-fetched on Reveal via `GET .../password`
  (admin-only); Save guarded by a dirty flag (can't accidentally clear).
- [x] Middleware imports `BD_DEPARTMENT`/`CRM_PREFIX`/`CRM_DEALS_PREFIX` from `lib/crm/access` (no dupes).
- [x] Atomic `crm_set_primary_document()` RPC (no zero-primary interleave); storage-delete errors logged;
  `dev_profile_documents.updated_at` + trigger; empty-state `colSpan`; `DocRow` moved to module scope.
- Confirmed-solid by both: password never audited, secrets admin-only across all layers, service-role
  server-only, routes re-derive role. Nits left as forward structure (`auth_department`, unused exports).

## Gate before "done" ✅
- [x] `tsc` clean · `build` green · CRM E2E 3/3 (re-run after fixes) · screenshots read · KB synced.
- [x] re-ran `npm run report` after `0012` → **ALL §14 PASS** (unit 14/14, RLS 14/14, integration 10/10, tsc).
- [x] moved plan → `done/`; committed.

**SHIPPED 2026-07-01.** CRM Profiles foundation live: access gating (departments/flags/helpers/guard),
`dev_profiles` + resumes (private storage, signed URLs, audit), admin CRUD + BD read-only. Follow-ups
noted above (RLS-suite coverage; wire employee editor to `department_id` then flip `auth_is_bd()` to the FK).
