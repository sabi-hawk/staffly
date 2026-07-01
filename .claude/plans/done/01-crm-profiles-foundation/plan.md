# Plan 01 — CRM Foundation: Access + Profiles & Resumes

**Status:** upcoming (awaiting owner approval of the approach — no code yet)
**Sources (the agreed requirements):** [FRD-05 Roles/Departments & Access](../../../knowledgebase/frds/FRD-05-roles-access.md) ·
[FRD-01 Profiles & Resumes](../../../knowledgebase/frds/FRD-01-profiles.md) ·
context: [FRD-00 CRM vision](../../../knowledgebase/frds/FRD-00-crm-vision.md)

> The first CRM slice. It builds the **access foundation** (so only BD-department employees + admins see
> the CRM) and the **Profiles & Resumes** module on top of it. Both FRDs are Approved; this plan is the
> *how*. Requirements live in the FRDs — not repeated here.

---

## What & why
Centralise the Drive/Sheets "Profiles" workflow into the portal: a `dev_profiles` registry (standalone
marketing identities), each with an owner BD, an admin-only account password, and resumes/cover-letter in
private storage — gated so BDs see only their assigned profiles (no password) and non-BD employees see no
CRM at all. This unblocks Interviews/Assessments/Deals (all reference a profile).

## Approach — three slices (each independently shippable, gate stays green)

### Slice A — Access foundation (FRD-05)
- **Migration** `00NN_crm_access.sql`:
  - `departments` lookup (id, name, sort_order, active) + seed existing values; add `profiles.department_id`
    FK and backfill from the current free-text `profiles.department`; keep the text column for now
    (drop later) to avoid breaking the employee editor mid-flight.
  - `auth_is_bd()` security-definer fn: `auth_role() in ('admin','super_admin') OR (auth_role()='employee'
    AND department_id = <BD>)`. Mirrors `auth_role()` (`0003_rls.sql`).
  - Person flags on `profiles`: **`is_bd_lead`** (elevated BD — sees all BDs' CRM data incl. deals) and
    **`is_developer`** (selectable as an interview/assessment developer; lets the founder admin accounts be
    picked as developers). Plus `auth_is_bd_lead()` security-definer helper. (FRD-05 FR-7/FR-8.)
- **`lib/nav.ts`**: `navForRole(role, department?)` → add a **CRM** nav group (Profiles; My Profiles for
  BD; Deals for admin later). Shown to BD + admin/super-admin only. (`Profile.department` already reaches `AppShell`.)
- **`lib/types.ts`**: extend `Profile` with `department_id` (+ joined department name); nav types.
- **`lib/supabase/middleware.ts`**: add `department` to the existing select; gate `/crm/*` (BD-or-admin)
  and reserve `/crm/deals` for admin/super-admin. Inactive users already blocked.
- **`app/(app)/layout.tsx` + `components/layout/app-shell.tsx`**: pass department into `navForRole`.

### Slice B — Profiles data, storage & UI (FRD-01)
- **Migration** `00NN_crm_profiles.sql` (RLS in the same file):
  - `dev_stacks` lookup (seed FS/BE/FE/SEO/WordPress/DE/AI-ML/MERN…), `dev_profiles`,
    `dev_profile_secrets` (1:1, password), `dev_profile_documents` (resume|cover_letter, is_primary).
  - **RLS:** `dev_profiles`/`dev_profile_documents` → admin/super all, **BD Lead all BDs'**, BD where
    `owner_bd_id = auth.uid()`; `dev_profile_secrets` → admin + super only (never BD/BD-Lead);
    `dev_stacks` → read any CRM user, write admin.
  - Audit triggers (`record_audit()`) on the three data tables; add their names to the Logs `ENTITIES`
    array (`app/(app)/admin/logs/page.tsx`). Ensure password isn't surfaced in audit payloads.
- **Storage:** new **private** bucket `crm-docs` (extend `scripts/setup-storage.mjs`); server-side
  **signed-URL** download; new `POST /api/upload/crm-doc` (pattern from `app/api/upload/avatar/route.ts`)
  with MIME (PDF/DOC/DOCX/img) + size validation.
- **Service:** `lib/services/dev-profiles.ts` (injected Supabase client) — list/get/create/update, assign
  owner, set/clear password (role-gated), add/list/set-primary/delete documents.
- **UI** (light theme, shadcn primitives, pagination/empty/toast/back-link patterns):
  - `app/(app)/crm/profiles` (admin grid: name, stack, owner, email, mobile, status, #resumes; filter by
    owner/stack/status; search) + `/[id]` detail/edit (password masked + reveal/copy; resume mgmt).
  - `app/(app)/crm/my-profiles` (BD: own profiles, read-only, no password, resume download).

### Slice C — Tests & verification
- **RLS tests** (`npm run test:rls`): BD cannot read another BD's profile or any `dev_profile_secrets`;
  non-BD employee blocked; admin sees all.
- **Integration** (`npm run test:int`): service CRUD; one-primary-resume invariant; owner assignment.
- **Browser-verify** (Playwright screenshots): admin profiles list/detail, resume upload+download,
  BD "My Profiles" with no password visible, non-BD redirected from `/crm`.

## Key files (from the codebase recon)
`supabase/migrations/` · `lib/supabase/middleware.ts` · `lib/nav.ts` · `lib/types.ts` ·
`components/layout/app-shell.tsx` · `app/(app)/layout.tsx` · `scripts/setup-storage.mjs` ·
`app/api/upload/avatar/route.ts` (template) · `lib/services/*` (pattern) · `app/(app)/admin/employees/page.tsx`
(grid pattern) · `app/(app)/admin/logs/page.tsx` (ENTITIES) · `lib/pagination.ts` + `components/ui/{table,pagination}.tsx`.

## Rules / acceptance
- Golden rules in `CLAUDE.md` (esp. **`dev_profiles` naming**, RLS-in-same-migration, RSC client-import
  pitfall, three-layer access, private storage). Acceptance = the criteria in FRD-01 §10 + FRD-05 §10.

## How we'll verify (the gate)
`npx tsc --noEmit` clean · `npm run build` green · `npm run report` all-PASS (incl. new RLS + integration
tests) · browser screenshots read · KB + `database.md` updated in the same change.

## Open / to confirm at build time
- Final migration numbers; whether to drop the legacy `profiles.department` text column now or in a
  follow-up; exact `dev_stacks` seed list; signed-URL TTL.

## Out of scope (later plans)
Interviews (FRD-02), Assessments (FRD-03), Leads/Deals (FRD-04), BD analytics dashboards.
