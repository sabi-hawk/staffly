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

## HR deal directory + deal-dev leave-form copy (2026-07-05)

| # | Decision | Rationale |
|---|----------|-----------|
| 65 | **HR-safe deal directory** — `/admin/deal-assignments` (admin+super) lists which developer is on which deal (name + role + status), via the `deal_directory()` definer fn that returns **no financials** and 0 rows for non-admins. The deal-dev leaves apply-form drops the "8/yr · 1/mo · 21-day" copy in favour of a record-only note. | The earlier-deferred bits: HR needs to know a dev's deal assignment (the owner's "might be") without seeing deal money; and the leave-form helper text shouldn't quote our quotas to a developer whose leave is client-governed. |

## Leave approval + CRM date-filter restyle (2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 66 | **ALL leave requests now require admin approval** — casual & unpaid are created `pending` (they used to auto-approve). Balances still count APPROVED leave only, so "casual this month" stays until an admin approves. The 1-casual/month guard (counts pending+approved) still blocks a 2nd. | Owner: a casual leave was auto-approving; nothing should be approved until the admin acts. Overrides the earlier "casual auto-approved" golden rule. |
| 67 | **CRM grids' date filter restyled to the attendance style**: preset tabs (Last 30 days / Last 3 months / Custom) on the right + the resolved "from → to (inclusive)" range on the left; default **last 30 days** for Leads / Interviews / Assessments. Uses `?range` + `resolveRange` (was `?from&to` with 1w/1m/3m/All). | Owner wants the clean attendance-summary filter style applied across CRM, with the selected range visible. Leads moves from All-default to 30-day-default for consistency. |

## Shared CRM interview calendar (2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 68 | **Shared CRM interview calendar** (`/crm/calendar`, BD + admin) via the security-definer `crm_calendar()` fn — every scheduled interview shows as a chip (time · stack), coloured by the owning BD (deterministic golden-angle hue from their id). **Cross-BD privacy:** other BDs see only time + stack + colour; the owner (or admin/super) sees + can expand full details (company, role, developer, round). | Owner: BDs need a shared view of interview bookings (to not double-book a developer) without leaking one BD's pipeline to another. Interviews are RLS-owner-scoped, so a definer fn masks non-owned rows. Reminder/alerts are the next slices. |

## Admin "needs your attention" (calendar/alerts/reminders slice 2, 2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 69 | **Admin dashboard "Needs your attention" card** — surfaces **pending leave approvals** + **interviews scheduled today** (each linking to /admin/leaves and /crm/calendar), above the existing Notifications/Alerts. | Owner: on login the admin should immediately see what needs action (esp. pending leaves, now that nothing auto-approves). Reuses existing RLS (admin reads all leaves/interviews); no new tables. |

## Interview reminders (calendar/alerts/reminders slice 3, 2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 70 | **In-app interview reminders** — a global `InterviewReminders` client (mounted in the app shell for CRM users) polls the caller's OWN upcoming interviews every 60s and, ~30 min before, fires a toast + a soft Web-Audio beep (once per interview, deduped via localStorage). Audio is best-effort (armed on the first user gesture, per browser autoplay rules). | Owner: a BD should be nudged ~30 min before their interview while the tab is open. Own-interviews only (RLS + owner filter); no server push needed — a light client poll. |

## RBAC foundation (FRD-08 slice 1, 2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 71 | **RBAC model: one role per user + capability flags** (owner-confirmed). 43-key permission catalog; 8 system roles (Employee, Deal-assigned Developer, BD, BD Lead, HR, Accounts, Admin, Super Admin) each stored with a written `reason`; `role_permissions` matrix seeded to reproduce today's behaviour; custom roles later creatable by super-admin (`roles.manage`). `base_role` on every role = its legacy RLS ceiling until policies migrate — so no role can ever exceed its legacy equivalent at the data layer (no UI-only security). | FRD-08 approved by owner. Foundation ships additively (zero behaviour change) so the risky wiring (nav/middleware/pages/RLS) can land as its own reviewed slice. Backfill verified: all 12 users mapped correctly; grant counts employee 8 → super_admin 43/43. |
| 72 | **Annual-leave notice is DATE-based (Asia/Karachi)** — starting exactly 21 days from today is acceptable. | The instant-based check made "exactly 21 days ahead" fail depending on time of day (surfaced as a date-dependent test flake when today+21 landed on a Monday). "At least N days in advance" is naturally a date rule. |

## RBAC enforcement wiring (FRD-08 slice 2, 2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 73 | **Permissions enforced in all three layers**: middleware maps route-prefixes → permissions (one query fetches status+grants); the nav is built from grants (`navForPerms`); `getCurrentProfile()` attaches `perms` so the shared helpers (`canSeeCrm`/`isBdLead`/`canSeeDeals`) and ~45 page/route guards are permission-driven; ~30 RLS policies + the CRM helpers (`auth_is_bd`/`auth_is_bd_lead`) + 2 definer fns key on `auth_has_perm()` (0036). Verified live: an employee-enum user with the **Accounts** role uses Payroll (nav + page + data) with no Employees/CRM; **HR** gets people-ops with payroll/credentials/CRM hidden; middleware denies redirect to /dashboard. | The owner's core ask: everything visible/usable only if the role grants it. Seeded grants reproduce today's behaviour, so legacy personas are unchanged (verified: super/BD navs identical, BD blocked from payroll). |
| 74 | **v1 simplifications (documented):** CRM own/all scope travels together (`auth_is_bd` = any own-scope grant; `auth_is_bd_lead` = any all-scope grant); `crm.profiles.password` doubles as the "CRM administration" gate (profile create/edit, doc hard-delete) matching today's admin-only behaviour; role assignment stays super-admin-only at the guard trigger. | Keeps the wiring surgical; each can be split into finer permissions later without schema changes (add keys + regrant). |

## RBAC user management UI (FRD-08 slice 3, 2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 75 | **User management extends the existing Employees area** (no duplicate module): a **Role card** on the employee detail (assign role — syncs the legacy base role + bd-lead/deal-dev flags server-side; self-demotion blocked), a **Role column** on the employees list, and a new **`/admin/roles`** page — every role with its description + REASON + grant/user counts, editable permission matrix (system roles: grants/text editable, not deletable; Super Admin can't lose roles.manage), and custom-role creation (custom roles get base_role='employee', the safest ceiling — access comes purely from their grants). | Owner: one place to create users → credentials → assign role, roles with written reasons, super-admin creates custom roles. Create-employee + credentials already lived on the employees pages; duplicating them into a parallel /admin/users would violate DRY. |
| 76 | **Security-review fixes shipped with the slice** (review of slices 1-2 was GREEN, 2 warnings): new `crm.profiles.manage` perm + the last admin-enum CRM policies migrated (HR/Accounts can't write CRM via SDK — adversarially tested); profile-manage routes moved off the semantically-wrong `crm.profiles.password` gate; the guard trigger keys role assignment on `users.assign_roles`; credentials route validates employeeId as UUID. | The review required both warnings closed before HR/Accounts are assigned to real users — this slice is what enables assignment. |

## Analytics admin-only + performance module + closed-lead masking (2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 77 | **BD Performance is admin/super-only** via an RBAC regrant (crm.analytics.view revoked from bd/bd_lead) + a /crm/analytics middleware rule — nav/pages followed the grant with no code changes to hide it. Page rebuilt: range presets+custom, totals, a per-BD grouped **bar chart** + weekly **line chart** (dependency-free server-rendered SVG in components/charts/), and a breakdown grid (leads/interviews/selected/assessments/deals closed/dismissed). | Owner: performance data is for management, and CRM permissions must segregate by inner module (this demonstrated it). No chart library added — 2 small SVG components keep the bundle clean. |
| 78 | **Closed (won) leads are masked from BD/BD Lead at the DB** — new `crm.leads.closed` perm (admin+super); leads SELECT/UPDATE/DELETE deny closed rows to others (the FOR ALL policy was split since it implicitly granted SELECT). The owning BD keeps their **count** via `my_closed_deals_count()` (chip on the Leads tab: "N deals closed — details with admin"). BDs can still SET a lead to closed (WITH CHECK allows the transition); after that it's admin territory. | Owner: once the deal closes, the data is management's; the BD keeps only the track record. Enforced at RLS, not just UI (adversarially tested: owner BD + BD Lead blocked, admin reads, owner can't edit closed). |
| 79 | **Owner-requested full reviews done** (senior code review + product QA/product-owner). Shipped immediately: payroll-generate/admin-leaves/avatar routes moved off legacy role checks (RBAC split risk), app-layout double perm fetch removed, handbook "casual auto-approved" stale text fixed, **leave rejection reason** plumbed end-to-end (admin prompt → decision_note → shown to the employee), dead lib/crm/date-utils deleted. Remaining findings logged in the changelog as the next backlog. | The three criticals were cheap and high-trust; the rest (notifications dismiss, employee notification feed/emails, announcements edit/delete, CSV leave columns, bdOptions-by-perm, typing debt, notifications timezone, dashboard Promise.all) are planned work, not silent debt. |

## Review backlog batch: missing-day deductions, notifications, polish (2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 80 | **Missing-day payroll deduction** (owner design): a past scheduled working day (shift days_of_week, holidays excluded, `< companyToday()`) with **no attendance check-in and no approved leave** deducts base/working-days like unpaid leave, as a separate "Missing attendance deduction" payslip line whose **description lists the dates** ("Missing record — … on N day(s): MM-DD, … Verify/fix the day and regenerate to clear.", first 10 + count). The payslip's deductions column now renders the description (particulars already did). In-progress months never deduct today/future days. **Known limitation:** a run generated ON the period's last day skips that day in the missing check but still counts it in the working-days denominator (rate diluted by one day, never over-deducted); regenerating after the period ends is exact. | HR gets an actionable justification per deducted day: fix the record (attendance or leave) and regenerate — the deduction clears itself. Deterministic from data already in the run query (one extra leaves/shift/holidays fetch, parallelised). |
| 81 | **Employee notifications are DB-definer-trigger-fed** (`employee_notifications`, 0039/0040): leave decisions and announcement fan-out insert rows server-side; clients can only read/mark-read their own. The topbar bell (all users, 90s poll, mark-read on open) + a best-effort **leave-decision email** in the decide route (console-stubbed without RESEND_API_KEY, never fails the decision). | Zero app-side plumbing for creation — any future writer (SQL, cron, service role) gets notifications for free, and there is no client insert path to abuse. Email covers closed-tab users. |
| 82 | **⌘K command palette derives its destinations from `navForPerms()`** (the already-permission-filtered nav) + a lazy employee search shown only with `employees.view`. Topbar search button dispatches the same open event. | The palette can never leak a page the user's role can't reach — one source of truth for "where can I go". |
| 83 | Smaller shipped fixes: admin-notification **dismiss** (`resolved_at`, RLS `notifications.view`); **announcements edit/delete + pagination** (inline edit card, RLS `announcements.manage` already allowed ALL); report **CSV** gains summary rows (working/worked/leave/missing days + leaves-by-type); `bdOptions()` keys on **app_roles bd/bd_lead** not free-text department; `notifications.ts` date math moved to **companyToday()** (birthday window, 25th payslip reminder, dedup keys — was server-local); `EmployeeReport.daily` typed (`ReportDay`), share-text params typed; admin dashboard's 7 reads run in one `Promise.all` and attendance `select("*")` narrowed. | The owner approved this exact backlog from the codebase reviews (#79); each item is smallest-change-that-fixes. |

## Session longevity + sidebar IA (2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 84 | **Session strategy documented + resume UX added (no re-auth churn).** Verified: cookie-based Supabase SSR sessions — 60-min JWT auto-refreshed by the middleware on every navigation AND by the browser client while a tab is open/on tab-focus; refresh tokens rotate (confirmed live) and never expire by default, so a session lasts until sign-out/deactivation — an all-day BD never re-logs. Added the graceful edge: middleware carries `?next=<path>` to /login (deep-link resume), the login page returns the user to exactly where they were, and a `SessionGuard` (tab-visible/online/10-min check) catches the rare dead-refresh case (revoked elsewhere, deactivation) and redirects to `/login?expired=1&next=…` with a "pick up where you left off" notice instead of broken pages. | Owner: BDs use the portal all day and idle-returns must resume seamlessly. The refresh machinery already guaranteed that; what was missing was resume-on-expiry UX, not longer tokens. No dashboard changes needed (keep JWT 1h; no session time-box/inactivity timeout). |
| 85 | **Sidebar IA: 16 flat items → ≤10 grouped entries** (owner delegated the final grouping). Slots pick the ops page over the self page per label; groups with one visible child render flat (no pointless expander). Final: Dashboard · Attendance & Leaves (group) · Calendar · Announcements · CRM (group) · Payroll · **People** (Employees/Roles/Deal assignments) · **Reports & Logs** (Reports/Activity Log) · **Documents** (Handbook/Product doc) · **Settings** (Company settings/My profile). Employee sees 6 flat-ish items (Handbook + My profile collapse). Calendar stays top-level (daily-glance page, didn't fit "Reports & Logs" semantically). Deal assignments lives under People (it's an HR directory). | Owner: ≤10-15 items, group like CRM, employees+roles = user management, docs together, profile+settings common; room to grow. The ⌘K palette + middleware needed zero changes (nav-derived + route-perm map are independent). |

## Settings cleanup + holiday audiences (2026-07-06)

| # | Decision | Rationale |
|---|----------|-----------|
| 86 | **Holiday audiences are enforced in the working-day math, not just hidden in the UI** (0041): `holidays.department_ids uuid[]` (null = everyone) + `include_deal_developers` (default true; UI defaults it OFF for team-scoped holidays). One SQL fn `employee_holidays(emp, from, to)` drives dashboard/calendar/announcements-list/payroll, and `working_days()` uses the same predicate — so a deal-assigned developer outside a holiday's audience keeps that date as a working day (verified: 20 vs 19 working days, holiday invisible). Global unique-date constraint relaxed to (date, name) so two scoped holidays can share a date. Existing holidays stay company-wide. "Everyone except X" = multi-select all teams but X. | Owner: deal-devs follow the client's calendar; holidays may be per-team. Visibility alone would desync attendance/leave/payroll from what the employee sees. |
| 87 | **Holidays management moved to /announcements** (settings keeps a pointer): list w/ audience chips for managers, own-applicable list for everyone, add-form with audience picker + "Post an announcement" (default on — writes an announcements row with the audience sentence, which the 0039 trigger fans out to every bell). Settings page: company name field REMOVED (branding fixed; value still feeds the payslip letterhead), "Overtime warning (h)" renamed **"Still checked-in alert (h)"**, and every field got an ⓘ InfoHint (reused `components/crm/info-hint.tsx`) explaining what it does and why. | Owner: settings had unexplained fields, "overtime warning" sounded punitive (it's an admin forgotten-checkout alert), and holidays belong next to announcements where they're communicated. |

## UI modernisation batch (2026-07-07)

| # | Decision | Rationale |
|---|----------|-----------|
| 88 | **Floating-label fields are THE platform field convention** (`components/ui/field.tsx`: FloatInput/FloatTextarea/FloatSelect/FloatShell; DatePicker/DateTimePicker take `label`/`hint` natively; reference: `components/crm/profile-form.tsx`). The label rests inside the control and floats onto the top border on focus/fill; the InfoHint (now a FILLED info glyph, not a letter-like outline) rides the label in both states, so no show/hide toggle is needed. Every form was migrated; recorded in `.claude/rules/conventions.md` so all future work follows it. | Owner supplied reference screenshots (insurancemarket.ae) and asked that this become the standing convention with the info icons preserved. |
| 89 | **No browser-native UI anywhere**: confirm()/prompt() replaced by ConfirmDialog/ReasonDialog (Radix) at 13 call sites (incl. the leave-reject reason); native date/datetime inputs replaced by a react-day-picker + popover DatePicker/DateTimePicker (string drop-in API); native file inputs replaced by a styled drag-and-drop FileInput. Badges: rounded-md, coloured border + tint, CSS-capitalised (fixes lowercase "approved" portal-wide). Approve/Reject-style buttons: soft coloured border + tint (`variant="success|danger"`); the check-in/out CTA keeps solid colours via override. Em dashes removed from user-visible copy (conventions rule added). | Owner: modern sleek platform, no native JS modals/pickers, no AI-tell punctuation. One shared primitive each means the convention holds everywhere at once. |
| 90 | **One topbar bell.** The employee notifications bell absorbs the CRM alerts feed as a second "Alerts" tab (notifications.view holders only); badge = unread across both; opening a tab marks it read. `components/crm/alerts-bell.tsx` deleted. | Two adjacent bells were indistinguishable; one bell with tabs keeps both feeds one click away. |
| 91 | **Profile numbers** (0043/0044): `dev_profiles.profile_no` auto-assigned from 11, unique, backfilled by creation order; searchable by number on the profiles list; shown as a chip on list + banner, in all profile pickers and on the CRM calendar detail ("#14 Ali Ahmad · Backend" = the full memorable identity). Auto-assignment (not hand-maintained) with uniqueness so an admin CAN edit via SQL/console if ever needed. | Owner: two profiles can share name+stack; BDs need a short spoken identifier ("Ali #14") that nobody has to maintain manually. |
| 92 | **CRM profiles page**: notes removed from the banner (edit-form only; they're internal warnings), edit moved onto the banner (Edit toggles the banner into the form, like interviews), document upload rebuilt as an "Add a document" card (FileInput + Type/Label/Note floats + primary checkbox). **Account password stays**: `dev_profile_secrets` holds the PERSONA's account credential (the email/LinkedIn identity the profile applies with), super-admin/manage-gated, revealed on demand; it is not a portal login. **Leads Owner filter**: hidden from plain BDs (their grid is already self-scoped); BD Lead gets it defaulting to SELF with an explicit "All BDs" option (CrmFilterBar `defaultValue`); admins unchanged. | Owner feedback batch on the profiles + leads screens; the password question answered from FRD-01 (profiles are applying personas with their own accounts). |

## Field/select consistency pass (2026-07-08)

| # | Decision | Rationale |
|---|----------|-----------|
| 93 | **One field standard, enforced everywhere.** Migrated the last hold-outs that predated the floating-label rollout: the attendance controls (Employee → `FloatSelect`, custom From/To → labelled `DatePicker`, Range → a matched-height segmented control with the awkward bold "Range" label dropped), the lead **edit** card `LeadDetailsCard` (was `FieldLabel` + native selects), the CRM `filter-bar` (profiles/leads/interviews/assessments filters now `FloatSelect` + `FloatInput`, matching leaves), plus `disqualify-panel`, `deal-developers`, `employee-editor`, `role-assign`. Dead `FieldLabel` component deleted. | Owner: attendance/lead-edit/CRM-filter fields looked different from the good leaves fields; maintain ONE standard. |
| 94 | **`FloatSelect` label now ALWAYS floats** (a `<select>` always shows its selected option, so a resting label would overlap the value, e.g. "Owner (BD)" over "Unassigned"). Added **`NativeSelect`** (compact styled native select) for filters/utility controls that don't warrant a floating label. Both use one chevron treatment: `size-[18px]`, `text-text-secondary/70`, with a real gap from the right border. | Fixes a latent overlap bug and the owner's complaint that select arrows touched the right wall / were too heavy. Compact controls stay compact but consistent. |

## Custom dropdowns (open below) + stack combobox (2026-07-08)

| # | Decision | Rationale |
|---|----------|-----------|
| 95 | **FloatSelect rebuilt on Radix Select** (`@radix-ui/react-select`) so the option list opens BELOW the field via `position="popper"` (native `<select>` centres its popup over the field on macOS). Kept the exact `<option>`-children + `onChange({target:{value}})` API so no caller changed; empty-string option values (All / Not set / Me / Unassigned) map to a private sentinel because Radix reserves `""`. Shared dropdown styling in `components/ui/select-content.tsx`. | Owner: every dropdown (owner/status/filters) opened centered on top of the field, so you couldn't tell which one you opened. Radix anchors the list under the trigger and is fully stylable. |
| 96 | **Stack field is now a dropdown + "Add a new stack"** (`components/crm/stack-field.tsx`): lists existing stacks (same look as the other selects) with an add action that swaps to an inline input; the new name shows selected immediately and is created on save (backend already find-or-creates by name). Profile banner status uses the sleek `StatusPill` (dot + Title-cased label) instead of a plain Badge, so "Active" is capitalised and consistent with the list. | Owner: the stack was an odd text-with-datalist field (not a dropdown like the others) and needed a way to add new stacks; the banner "active" showed lowercase. |

## BD dismiss-not-delete for CRM activity records (2026-07-08)

| # | Decision | Rationale |
|---|----------|-----------|
| 97 | **A BD can DISMISS (soft-hide) an interview/assessment but never hard-delete or restore; only a super admin restores or deletes.** Migration `0049`: `dismissed_at/dismissed_by/dismiss_reason` on both tables; DELETE tightened to `auth_role()='super_admin'` on leads/interviews/assessments (0013's `owner_write` for-all split into owner_insert + owner_update + super_delete; 0038's owner-scoped lead delete dropped); a BEFORE-UPDATE trigger `crm_guard_undismiss` lets a non-super only set `dismissed_at` (null→now), never clear/re-stamp it, and stamps `dismissed_by=auth.uid()` server-side. Defense in depth: the `[id]` PATCH/DELETE routes also gate restore/delete to `isSuperAdminRole`. UI: dismissed rows render struck-through + dimmed; row actions show **Dismiss** (eye-off) for a BD, **Restore** + **Delete** for a super admin (both grids + the lead-detail activity list). Leads already soft-hide via `status='dismissed'`, so no lead delete surface changed for BDs. | Owner: "BD can't delete leads/interviews/assessments, only dismiss (strikethrough/cross); super-admin un-dismisses/deletes." Keeps records for audit and stops a BD erasing pipeline history, while giving the owner full control. |

## Platform danger password on super-admin hard deletes (2026-07-08)

| # | Decision | Rationale |
|---|----------|-----------|
| 98 | **A second env secret `DANGER_PASSWORD` gates ALL super-admin hard deletes** (owner-chosen scope). Server: `lib/danger-core.ts` (pure `dangerConfigured`/`verifyDangerPassword`, constant-time) + `lib/danger.ts` `requireDangerForSuper(req, role)` returning a `403 {danger:true}` when a super admin's delete lacks/mismatches the `x-danger-password` header. Applied to all 11 crucial DELETE routes (CRM records + docs, deals, receiving/payment, roles, interviews/assessments); the payroll draft-line delete is excluded (draft edit, not crucial-data destruction). Client: a single `DangerFetchInstaller` mounted in the app shell monkey-patches `window.fetch` — on the `403 {danger:true}` signal it opens a password dialog and RETRIES with the header, so every current/future destructive fetch is covered with zero per-button wiring; cancel returns the original 403 for normal error handling. **Opt-in by config**: inactive until `DANGER_PASSWORD` is set (deploying this never locks anyone out); only super admins are gated (the threat model is a compromised owner account). | Owner: "define in the ENV a platform-wide password so even with my account's email + password, someone still can't delete something crucial." A second factor on destructive actions protects crucial data against a fully compromised owner login. Chose the universal fetch-wrapper so coverage is complete and can't be forgotten on a new delete button. |

## BD daily job-application counts (2026-07-08)

| # | Decision | Rationale |
|---|----------|-----------|
| 99 | **A BD's primary daily-work capture is a per-profile job-application count**, kept separate from the textual task summary. New `bd_job_applications` (unique per dev_profile+day); the ONLY write path is the definer `save_job_counts(work_date, counts[])` RPC, which uses `auth.uid()` and accepts a count only for a profile the caller OWNS (so a BD can't log against someone else's profile, and there's no direct-write RLS policy to spoof). Reads are owner-scoped (BD sees own; BD-Lead/admin/super see all for performance oversight). UI: a `BdJobCounts` card on the dashboard auto-lists each profile the user owns (label = `#no Name · stack`) with a count input, a live **total** (aggregate) and per-profile **segregated** chips; shown to anyone owning ≥1 profile (BD or BD-Lead), hidden otherwise. The existing rich-text task summary stays for "other work" (resumes, cover letters, LinkedIn, mentoring juniors). Detection = "profiles you own" (not role), so it naturally scales 1..N profiles and excludes admins who apply to nothing. | Owner: 70-80% of BDs only post job counts against their assigned profiles daily; make that the primary experience with an at-a-glance total + breakdown for performance, while still allowing free-text for the occasional other work. Ownership-checked definer RPC keeps it tamper-proof. |
