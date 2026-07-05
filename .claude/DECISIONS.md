# Staffly — Decisions Log

Sensible defaults chosen autonomously where the spec was silent or ambiguous, per the
build instruction to keep going rather than ask.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Migrations applied via `SUPABASE_DB_URL` (Session pooler, Singapore), not the direct `DATABASE_URL`.** | Direct host `db.<ref>.supabase.co` is IPv6-only and returns `ENOTFOUND` on networks without IPv6 (incl. this env). The pooler points at the **same** database; `select 1` verified, PostgreSQL 17.6. Runner prefers `SUPABASE_DB_URL`, falls back to `DATABASE_URL`. |
| 2 | **Migration tooling = custom Node runner (`pg`), not the Supabase CLI.** | `SUPABASE_ACCESS_TOKEN` in `.env.local` is a placeholder (`sbp_xxxxxxxx`), so `supabase link`/`db push` can't authenticate non-interactively. A `pg`-based runner with a `schema_migrations` ledger is deterministic and idempotent. |
| 3 | **Build committed on `main`.** | Greenfield repo with zero prior commits; `main` is the intended project branch. Per-phase commits as requested. |
| 4 | **Package manager = npm.** | Already present; no lockfile preference expressed. |
| 5 | **Email is console-stubbed** via `lib/email` `EmailProvider` interface whenever `RESEND_API_KEY` is blank (current state). | Per instruction; swaps to real Resend client when a key is present, same call sites. |
| 6 | **Seed reconciles with the `handle_new_user` trigger.** | §6.2 auto-inserts a `profiles` row on auth signup. Seed creates auth users first (fixed UUIDs), then `seed.sql` upserts/updates profile fields (`on conflict (id) do update`) so trigger + seed don't collide. |
| 7 | **`days_count` / working-day math uses `working_days()` (§6.4)** excluding holidays and respecting each shift's `days_of_week`. | Single source of truth shared by leave + payroll. |
| 8 | **Realtime, Storage, PDF payslip, PWA, Lighthouse** treated as best-effort polish (Phase 9). | Core verifiable contracts (DB/RLS/trigger math, hours, payroll, leave, crons) are prioritized for testing against the live DB. Anything stubbed is noted in `RUNLOG.md`. |
| 9 | **Timezone Asia/Karachi, currency PKR, week starts Monday** | PRD §18.1 defaults. |

## v2 (Softonoma overhaul) decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 10 | **Replaced the 5 fake employees with the 7 real staff**; tests repointed to **Muzammal Faiz** as canonical subject. | Owner wants real data in a production launch; demo admin logins (founder/hr) kept. |
| 11 | **Employees get logins now** (email + `Softonoma@123`). | Enables the employee experience immediately; owner confirmed. |
| 12 | **Compensation is fully dynamic** (`compensation_components`: label/amount/description/recurring) replacing fixed OT/commission/benefits; base salary stays fixed. | Owner needs arbitrary categories (fuel, deal commission, extra-hours, bonus). Legacy salary columns left nullable for back-compat. |
| 13 | **Payslip = printable page + browser "Save as PDF"** (print CSS), no heavy PDF lib. | Reliable, zero-dependency, production-safe; can add a server PDF lib later if needed. |
| 14 | **Avatar uploads stored in Supabase Storage** (public bucket `avatars`, key `<employee_id>.<ext>`). | Serverless-safe (works on Vercel). Uploaded via `/api/upload/avatar` with service-role after a self-or-admin check; `profiles.avatar_url` holds the public URL. `npm run storage:setup` provisions the bucket. (Superseded the earlier local-disk approach.) |
| 15 | **Light theme + Softonoma branding**; standalone Shifts page removed (shift now lives on the employee). | Owner feedback; reduces nav clutter. |
| 16 | **Audit visibility = super_admin only** (tightened from admin). | Audit rows include salary/compensation changes; keep compensation private. Generic DB triggers skip service-role/seed writes to keep the panel clean. |
| 17 | **Pagination constants live in `lib/pagination.ts`** (not the `"use client"` component). | Importing values from a client module into a server component yields a client-reference proxy (caused 0-row grids). |
| 18 | **Knowledge base + workflow-driven development** (`CLAUDE.md` + `knowledge-base/`). | Owner wants minimal involvement, no context repetition, and production readiness; agents read+update the KB and self-validate. |
| 19 | **Username login** (`first.last`) for employees; **email login** for the two admin accounts (`super.admin@softonoma.com`, `admin@softonoma.com`). | Owner spec. Username→email resolved pre-auth via a security-definer RPC; `profiles` read tightened to authenticated-only to stop anon enumeration. |
| 20 | **Employee password convention `Softonoma@<employee_code>`**; admin passwords `Softonoma@<random>`. Admin/super-admin can edit username + reset password from the employee panel. | Owner spec. |
| 21 | **Portal password stored in `employee_credentials` (plaintext)** so admins can view/copy/share it. | Explicit owner requirement (visible + copyable credentials for an internal tool). Restricted by RLS to admin/super-admin/self; auth itself still uses Supabase's hashed password. Tradeoff accepted; revisit if the tool goes external. |
| 22 | **Deactivated employees blocked at middleware** (status=inactive → signed out), records retained. | Owner spec. |
| 23 | **Removed all fabricated data** (bank/IBAN/DOB/invented compensation). Only sheet-provided data seeded; real bank details added from the owner's payslips (Areeba pending). BD commission %s in `commission_policies`. | Owner: no fake data in production. |
| 24 | **CRM `receiving_accounts` (incl. bank account numbers) ARE audited** — `record_audit()` stores the full row in `audit_log.before/after`. | Deliberate: `audit_log` is super-admin-only read (payroll tier) and admins need a change trail for financial accounts. Contrast `dev_profile_secrets` (passwords), which are NOT audited. Revisit if audit visibility widens. |
| 25 | **CRM dev profiles = `dev_profiles`; `auth_is_bd()` keys on the text `department`; a guard trigger blocks non-admin self-edits of role/status/department/CRM flags.** | Naming collision with the load-bearing `profiles` table; free-text `department` is what the app+seed maintain (the `departments` lookup+FK is forward structure until the employee editor writes it). |
| 26 | **Audit log relaxed from super-admin-only to SCOPED** (Plan 04 / FRD-06): super_admin all; admin+BD-Lead non-financial; BD own CRM records. Financial/PII entries stay super-admin-only (`audit_read` RLS, `0017`/`0018`). | Owner wants a readable, broadly-useful Activity Log; the earlier blanket super-admin-only rule was too tight for day-to-day oversight. Financial/PII kept super-admin-only. `security.md` updated to match. |

## Whole-app audit fixes (Group 1 — blocker + highs)

| # | Decision | Rationale |
|---|----------|-----------|
| 27 | **`role` changes are super_admin-only for everyone — admins included** (`guard_profile_privileged_cols`, 0019). | Audit BLOCKER: an admin could `update profiles set role='super_admin'` on themselves — the self-update RLS policy has no column guard and the guard trigger previously exempted admins. The app never exposes a role editor to admins (add-employee hardcodes `role:'employee'`), so locking role to super_admin is safe and closes the escalation. |
| 28 | **Signup never trusts a client-supplied role** — `handle_new_user()` hardcodes `role='employee'` (0019). | Elevation must be a deliberate admin action, never self-service via signup metadata. |
| 29 | **Employees may only write their OWN attendance for the CURRENT company day** (0019 policies + `company_today()` Asia/Karachi); admin/super_admin retain full write. | Audit HIGH: direct RLS writes let an employee forge/backdate attendance → overtime/pay fraud. UI already scopes to today; RLS now matches. Multi-session same-day flows unaffected. |
| 30 | **Finalised payroll runs are immutable** — `generatePayroll` skips finalised runs (no un-finalise/line-wipe); `addPayslipLine`/`removePayslipLine` throw via `assertNotFinalised()`. | Audit HIGH data-loss: re-running "generate drafts" reset finalised runs to draft and wiped hand-edited payslip lines. App-layer guard (revisit with a DB constraint if needed). |

## Whole-app audit fixes (Group 2 — security & testing hardening)

| # | Decision | Rationale |
|---|----------|-----------|
| 31 | **Cron auth centralised in `lib/cron-auth.ts` (`isAuthorizedCron`), fail-closed + constant-time.** | Audit: the inline `auth !== ` + "`Bearer ${CRON_SECRET}`" + ` check *failed open* — with `CRON_SECRET` unset, a request sending literally `Bearer undefined` passed. Helper rejects when the secret is unconfigured and uses `timingSafeEqual` (length-guarded) to avoid a token timing oracle. Unit-tested (`tests/unit/cron-auth.test.ts`). |
| 32 | **Leave quotas honour an explicit `0`; casual default corrected 2→1.** | `Number(x) || DEFAULT` overrode a legitimate `0` quota (e.g. disabling casual leave) and the casual fallback was `2`, contradicting the golden rule (casual 1/mo) and the live `company_settings` (already 1). New `quota()` helper uses `Number.isFinite`. UI copy fixed to "Casual (1/mo)". |
| 33 | **CRM coverage added to the RLS gate.** | The heavily-reviewed CRM had no assertions in `npm run report`. Added 5 cases: a non-BD employee sees 0 leads/deals; admin/super read leads/deals. RLS suite 16→21. |

## Whole-app audit fixes (Group 3 — architecture & performance)

| # | Decision | Rationale |
|---|----------|-----------|
| 34 | **CRM doc-upload lifecycle extracted to `lib/crm/doc-upload.ts`** (`readValidatedDoc` + `stageCrmDoc`). | The deal/assessment/dev-profile upload routes triplicated the same validate (MIME/size/magic) → upload → rollback-on-DB-failure code. Behavior unchanged; each route keeps its own auth gate + RLS-bound insert. Server-only (imports the service-role client) — never import from a client component. |
| 35 | **`generatePayroll` per-employee reads parallelised** (working_days RPC + attendance + unpaid leaves + recurring comps via one `Promise.all`). | They were sequential (N+1-ish, 4 serial round-trips/employee). Independent queries, so concurrency is safe; the finalised-skip check still runs first. Employees stay sequential (writes). |
| 36 | **Deferred (Group 3, documented not done):** generated Supabase types; a sweeping `requireAdmin/requireCrm` route helper; payroll-list server pagination; propagate `.error` from the payroll reads (pre-existing fall-through to `\|\| 0`/`?? []`). | Types: the Supabase CLI can't auth non-interactively here (see #2), so codegen isn't wired — revisit if a real access token lands. Auth helper: the remaining per-route 3-line guard is clear and low-cost; a blanket refactor across ~20 routes is higher risk than payoff. Payroll pagination: the client groups runs by period, so it needs a UX rework + browser pass — out of scope for a safe refactor slice. Payroll `.error` throw: behavior change, both reviewers marked it "not a regression / future hardening". |

## Whole-app audit fixes (Group 4 — UX & accessibility)

| # | Decision | Rationale |
|---|----------|-----------|
| 37 | **Responsive sidebar**: desktop keeps the collapsible rail; below `md` it becomes an off-canvas drawer (hamburger in the topbar, backdrop, slide-in, closes on navigate). | The fixed `w-60` rail was unusable on mobile (ate horizontal space, no way to hide). `Sidebar` now renders both variants sharing one `NavLinks`; `AppShell` holds the open state and closes the drawer on route change. Browser-verified at 390px. |
| 38 | **App-Router `loading.tsx` + `error.tsx`** added at `app/(app)/`. | No loading skeleton (blank flashes during RSC fetches) and no error boundary (a thrown error blanked the screen). Loading = skeleton; error = client boundary with retry + dashboard link. Loading skeleton confirmed rendering in a screenshot. |
| 39 | **BD analytics date-range filter** (`?from&to`, validated `YYYY-MM-DD`, bounds each entity by `created_at`, `to` inclusive of the day). | Analytics was all-time only. New `DateRangeFilter` client control pushes the range into the URL; the server page re-filters. Verified: a 2020 range → empty state; a wide range → data returns. |
| 40 | **a11y label sweep** — `htmlFor`/`id` (or `aria-label` for icon/search/file controls) across the ~19 CRM/admin/leave form components, using the existing `Label` primitive. | Only the login form associated labels; the rest left inputs unlabeled (screen-reader + click-target gap). Visible label text kept identical so `getByLabel` e2e stays green. |

## CRM Leads redesign (FRD-07)

| # | Decision | Rationale |
|---|----------|-----------|
| 41 | **Lead status remodelled to a pipeline outcome** (`in_progress/on_hold/closed/rejected/dismissed`), separate from per-activity state. Existing rows migrated (0020). | The old `open/interviewing/assessment/won/lost/disqualified` conflated *activity* with *outcome* — a first touch can be an assessment or interview, so "interviewing/assessment" as a lead status was meaningless. Activity state stays on interviews/assessments. `dismissed` replaces `disqualified` and **reuses the `disqualified_*` columns** (audit continuity). |
| 42 | **"Closed" raises an admin alert, it does NOT auto-create/flag a Deal.** New `crm_alerts` table + SECURITY-DEFINER trigger on `leads` (status→closed); admin/super read+update, no client insert. | Owner wants a lightweight heads-up, not automation: the admin fills the financial Deal manually later (Deals module unchanged, still admin-only). Trigger-only insert means a BD can't forge an alert and RLS on the admin-only table isn't a barrier (same pattern as `record_audit`→`audit_log`). |
| 43 | **Three date concepts:** Entry=`created_at` (system), **Received**=editable email-arrival date (new `interviews.received_date`; `assessments.entry_date` reused), Modified=`updated_at`. | Owner asked for a system entry date, an editable email-received date (default today), and a modified column — all shown in the grids. |

| 44 | **CRM Leads hub (FRD-07 Phase 2):** one tabbed page (Leads cards / Interviews / Assessments grids), type-first Add flow (new/existing company, interview round auto-advances), inline card status+feedback; standalone Interviews/Assessments nav removed (old routes redirect). | Owner's redesign: one company-keyed place, simpler add. Reuses existing POST routes (owner_bd_id stamped server-side) + RLS. **Deferred follow-ups:** (a) `.or()` q-search now strips PostgREST metachars, but cross-BD PATCH still returns 200 on 0-rows (RLS blocks; a 404 refinement is optional); (b) Add flow isn't transactional — a lead can be created then its activity POST fail (orphan lead, self-heals on next activity); (c) the `rejected` state's dedicated UI beyond the card control. |

## CRM Profiles UX + documents v2 (2026-07-05)

| # | Decision | Rationale |
|---|----------|-----------|
| 45 | **Profiles UX batch (8 items):** owner filter + assign shown only to BD-Lead/admin (a plain BD can't reassign a profile away from themselves); "Clear filters" button on every CRM filter bar; badges title-cased via `labelize` + a shared `StatusPill`; whole grid rows clickable (`RowLink`, ignoring inner controls); instant CSS nav tooltips on the collapsed rail (native `title` had a ~1.5s delay); global `NextTopLoader` + `useTransition` pending states on filters; copy-to-clipboard (Slack-formatted) on lead cards + interview/assessment rows. | Direct owner feedback after walking the Profiles tab. All resolvable from conventions; the notable one is scoping owner reassignment to BD-Lead/admin (a BD seeing the owner dropdown could otherwise reassign to another BD). |
| 46 | **Profile documents v2:** per-doc `note`, multiple cover letters, **owner (BD) soft-delete** → **admin-only "Deleted (history)"** (view/download/**hard-delete**, no restore), browser-native **inline viewer** (`?inline=1` signed URL in an iframe; PDF/images only — DOC/DOCX force-download). Owner/BD-Lead/admin manage docs (`can_manage_dev_docs`); hard-delete stays admin-only. Migrations 0022–0024. | Owner wanted BDs to self-serve their profiles' resumes (mark primary, annotate, retire old ones) while keeping a recoverable-by-admin trail and an in-app preview. "No restore" per owner: history is view/download + permanent delete only. |
| 47 | **Soft-delete routed through a security-definer RPC** (`crm_soft_delete_document`), not a direct owner UPDATE. | Non-obvious Postgres RLS interaction: once the SELECT policy (0023) hides soft-deleted rows from a BD owner, that owner's own `UPDATE … set deleted_at=now()` is rejected — the post-update row is no longer selectable by them (admins are unaffected, their SELECT branch stays true). The definer function authorizes via `can_manage_dev_docs` and does the write with RLS bypassed, keeping "owner may soft-delete, history is admin-only" without loosening the SELECT policy. Covered by 4 new RLS tests (owner insert/soft-delete, non-owner blocked, admin history + hard-delete). |

## CRM list UX: shared filter toolbar + grid loader (2026-07-05)

| # | Decision | Rationale |
|---|----------|-----------|
| 48 | **`FilterShell` owns a shared `useTransition`; the loading spinner overlays the GRID, not the filter bar.** Filter controls read `nav`/`pending` from its context (fallback to a local transition when unwrapped). | Owner feedback: the pending state was dimming the filter controls; it should show on the data being fetched. One shell wraps each CRM grid (leads/interviews/assessments + profiles + deals). |
| 49 | **Filter selects keep their name visible ("Outcome ▸ value"); clear = a circular ✕ icon (tooltip "Clear filters").** Date control = custom range + presets (1w/1m/3m) with the "Received" label dropped; **Leads** gets the same presets via a `defaultAll` mode (adds "All", filters by `updated_at`, default = all so old open threads aren't hidden). | A bare native select shows only the chosen value, so a user couldn't tell which filter it belonged to. Leads is the top-level pipeline, so its date filter defaults to All (unlike the grids' 1-month default). |
| 50 | **Interview/assessment grid "edit" deep-links into the lead** (`?edit=<kind>:<id>` → `LeadActivity` opens that record's edit form + scrolls to it). | The link existed but the lead page never read the param, so edit just showed the lead (owner-reported bug). Activity editing already lives on the lead page, so we open it there rather than build a separate edit route. |

## Lead detail rework + company contacts + field hints (2026-07-05)

| # | Decision | Rationale |
|---|----------|-----------|
| 51 | **Lead top card edits in place (no modal); Job Description & BD Notes are their own editable sections below Documents.** Each PATCHes only its own field(s) via `/api/crm/leads/[id]` (owner-reassignment guard unchanged). | Owner feedback: the edit modal was an unnecessary layer, and JD/notes belonged on the page (not hidden behind edit). `LeadDetailsCard` toggles view↔edit inline (owner field only when BD-Lead/admin); `LeadRichSection` (reused for JD + notes) edits inline. Deleted `lead-edit-modal.tsx`. |
| 52 | **New `lead_contacts` — the CLIENT company's reps (HR/recruiter/admin/hiring-manager/other) with email/phone/LinkedIn, optional, per lead.** Owner-scoped RLS mirrors `lead_documents`. LinkedIn rendered as a link only for http(s) URLs (no `javascript:`). | Owner idea: log the company-side contacts so we can re-reach past leads during dry spells. Explicitly *their* contacts, not ours — the section copy + a per-field info icon make that clear. "Other" reveals a free-text role. |
| 53 | **Info icons (`InfoHint`) on CRM fields (lead/interview/assessment/contact) + section titles.** Central copy in `lib/crm/field-hints.ts`; `FieldLabel` pairs a label with its hint. | New BDs need to know what each field is for; a hover/focus tooltip keeps forms uncluttered while staying self-explanatory. |

## Attendance summary + dashboard privacy + loaders (2026-07-05)

| # | Decision | Rationale |
|---|----------|-----------|
| 54 | **Employee dashboard slimmed:** removed the four stat cards (annual-left, casual-this-month, extra/deficit) and the deficit/extra column. Leave balances stay in the Leaves tab only. | Owner: seeing "leaves left" nudges employees to take leave; dashboard should be a neutral at-a-glance (check-in, holidays, recent days). |
| 55 | **Attendance summary moved to the Attendance tab, gated by an admin flag** `show_employee_attendance_summary` (company_settings, default ON, super-admin toggles). Employees see worked-days/leaves/missing/extra-deficit + the deficit/extra column only when ON; admins always. Range default = **this month** (new `"month"` RangeKey, 1st→today); BD picks This month / Last 3 months, admin gets Custom (any range). | Owner wants the summary available (default on) but under admin control to hide later, and off the dashboard. Reuses `buildEmployeeReport` + `resolveRange`. The flag lives on the existing super-admin settings page (the owner's account); can widen to admin/HR later if needed. |
| 56 | **Casual leave: one request per month** — `requestLeave` blocks a 2nd casual when a pending/approved casual already exists that month (`casualRequestsThisMonth`), on top of the day-quota check. | Owner: "not more than one casual request per month." Counting pending+approved blocks a 2nd even before the first is decided (casual auto-approves today, but this is robust either way). |
| 57 | **Loaders:** login keeps its loading state through the post-auth navigation (~1-2s) + shows a spinner on the clicked demo button; check-in/out button shows a spinner while the request is in flight. | Owner reported no visible progress on login (button flashed back to "Sign in" during nav) and on check-in/out. |

## Daily task summary (2026-07-05)

| # | Decision | Rationale |
|---|----------|-----------|
| 58 | **Daily task summary = a rich-text HTML field on the `attendance` day row** (`daily_summary` + `summary_at` + `summary_late`), edited via the shared RichText editor. Shown as a "Task summary" column on the employee attendance + dashboard grids with a "today is missing" prompt; admin gets a "missing today's summary" list + a status column. | Owner wants a compulsory daily write-up of work done, like the lead BD-notes editor, with a nudge when missing and a warning when logged late. Uses the per-day attendance row (not a new table); the legacy `work_log` jsonb (never wired to UI) is superseded and deleted. |
| 59 | **Writes go through a security-definer RPC `save_daily_summary` (0028)**, not a direct table update: free same-day edit; **past+present = locked**; **past+missing = late add** (`summary_late=true`); future/empty/no-attendance rejected; updates ONLY the summary columns. | The `att_update` RLS policy (0019) restricts employees to updating TODAY's row, so a direct late-add on a past row silently no-ops (the security review caught this false-success). The definer function lets an employee late-add to a past row **without** gaining the ability to edit past times/hours. Tested as a real signed-in user in `rls-test.mjs`. |

## Deals: name + developer assignments (Tier-2 slice 1, 2026-07-05)

| # | Decision | Rationale |
|---|----------|-----------|
| 60 | **Deals get a free-text `name` + a many-to-many `deal_developers` assignment** (role = developer|closer; a person can be both, a dev can be on many deals). Assigned via an "Assigned developers" card on the deal detail (admin/super). Kept the legacy single `working_developer` column. | Owner: associate developer(s)/closer(s) with a deal; a dev can be closer and/or developer across deals. Extends the existing CRM deals (owner's choice) rather than a new module. |
| 61 | **A developer sees only their deal NAME(s)** on their dashboard, via the security-definer `my_deals()` — never the `deals` table (admin-only) or financials. | Owner: the associated developer sees just the deal name, not the money; HR/others don't see deal details. RLS is row-level (can't hide columns), so a definer function that returns only name+role is the safe boundary. (Financial split for Admin/HR = a later slice.) |

## Deals → super-admin only (Tier-2 slice 2, 2026-07-05)

| # | Decision | Rationale |
|---|----------|-----------|
| 62 | **Deal details (incl. financials) are super-admin only** (0030): `deals`/`deal_documents`/`receiving_accounts`/`deal_developers` tightened from admin+super to super_admin. `canSeeDeals`→super; middleware + nav + all deal pages/routes + the lead "Create deal" button gate on super_admin. | Owner: HR (the `admin` role) must not see a deal's salary/payment/details. RLS is row-level (can't hide just the money), so the whole deal surface is super-only; the developer's name-only view (`my_deals()`) is unaffected. The optional HR "which-deal-is-X-on" name+assignment directory is deferred (owner phrased it as a "might be"). |

## Deal-assigned developer role (Tier-2 slice 3, 2026-07-05)

| # | Decision | Rationale |
|---|----------|-----------|
| 63 | **New `is_deal_developer` flag** (profiles, admin-set, guarded like the other privileged flags, 0031). A flagged developer: annual/casual **balances hidden** on their Leaves page (a note explains why); leave requests are **record-only** — `requestLeave` bypasses our quota/notice/casual-cap and creates a **pending** request (admin marks) for any type. Toggled on the admin employee detail via a new "Roles & flags" card (which also surfaces the previously-UI-less Developer / BD-Lead flags). Handbook section added. | Owner: deal-assigned engineers work as part of a client company's team — their leave is governed by that company, not our policy. We still record leave (for our log) but don't apply our balances/caps, and it needs admin confirmation. Not all engineers are deal-assigned. |

## Product documentation page (Tier-2 slice 4, 2026-07-05)

| # | Decision | Rationale |
|---|----------|-----------|
| 64 | **Super-admin "Product doc" page** (`/admin/product`, nav under Payroll/Settings): a living in-app doc of what the product is, the roles & why they exist, and the applied business rules. Mirrors `reference/00-product-overview` + `08-access`. | Owner wants an authentic, growing product overview + roles/access reference for the super-admin. Updated the KB `08-access-and-accounts.md` for the new roles (deal-assigned developer) + deals-super-only. |
