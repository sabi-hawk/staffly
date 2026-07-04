# CRM · Profiles & Resumes

Central registry of **marketable developer profiles**. Requirements: [FRD-01](../../frds/FRD-01-profiles.md).
Delivery: Plan 01. Schema: `../../../database/database.md` (once built).

## What it is
A **profile = a standalone marketing identity** (name + stack + contacts + resumes + account login). One
real person can run many profiles; **no person/developer FK** on a profile. The only person attached is
its **owner BD**. Replaces the Drive `Profiles/` folder + `Profiles-Credentials` sheet.

## Data model
- **`dev_profiles`** — id, name, `stack_id`→`dev_stacks`, label (`"<name> - <stack>"`), `owner_bd_id`→
  `profiles.id` (a BD; null = Unassigned), email (one), mobile (one), dob (per-profile), status
  (active|inactive), notes ("LinkedIn banned" goes here), timestamps.
- **`dev_stacks`** — extendable lookup (FS/BE/FE/SEO/WordPress/DE/AI-ML/MERN…), admin-managed.
- **`dev_profile_secrets`** — 1:1, the account password (LinkedIn/Indeed login). **admin + super-admin
  only**; never BD. Separate table so a stray `select *` can't leak it (mirrors `employee_private`).
- **`dev_profile_documents`** — resume | cover_letter; `is_primary` (exactly one **active** primary
  resume); per-doc **`note`** (what it's for); files in private `crm-docs` bucket. Multiple secondary
  resumes (FS/FE/BE/Python variants) **and multiple cover letters** per profile. **Soft-delete**
  (`deleted_at`/`deleted_by`, 0022): a delete hides the doc from the profile but retains it in an
  admin-only **"Deleted (history)"** list where admin/super may **hard-delete** (removes the file).

## Rules
- Exactly **one primary resume** per profile among **active** resumes (new primary unsets the old;
  the partial unique index is scoped `where … and deleted_at is null`). Soft-deleting clears primary.
- Password readable only by admin/super-admin (RLS + API + UI mask); BDs never see it (owner applies it
  on the BD's machine himself).
- Label convention `"<name> - <stack>"`. Status is Active/Inactive; banned = a note, not a status.

## Permissions
- Admin/super-admin: full CRUD incl. password; assign/clear owner; manage docs; **hard-delete** docs
  from the "Deleted (history)" list.
- **BD (owner):** view profiles where `owner_bd_id = auth.uid()` — contacts/DOB — **excluding
  password**; **manages that profile's documents**: upload, mark-primary, edit note, view/download, and
  **soft-delete** (via `crm_soft_delete_document`). Cannot see the deleted-history list or hard-delete.
  Cannot edit the profile fields or password (admin/super only).
- **BD Lead:** all BDs' profiles + document management (same as an owner), still no password.
- Other employees: none.

## Key flows / screens
- `CRM → Profiles` (admin/BD-Lead): grid (name, stack, owner, email, mobile, status, #resumes) —
  paginated, filter by owner/stack/status, search.
- `CRM → Profiles → [id]`: detail/edit; password masked + reveal/copy (admin); resume mgmt; owner assign.
- `CRM → My Profiles` (BD): own profiles, read-only, no password, resume download.
- Uploads via the `crm-doc` route → private bucket; download via signed URL (audit-logged).

## Relationships
Referenced by [interviews](interviews.md), [assessments](assessments.md), [leads-deals](leads-deals.md).
Access model → [access.md](access.md). Audited → [activity-log.md](activity-log.md).

## As-built (Plan 01, 2026-07-01) — shipped
- Tables: `dev_stacks`, `dev_profiles`, `dev_profile_secrets` (**not audited** — keeps the password out
  of `audit_log`), `dev_profile_documents` (one primary resume via partial unique index). Migration `0011`.
- Storage: private **`crm-docs`** bucket; upload `POST /api/crm/profiles/[id]/documents` (owning BD /
  BD-Lead / admin — gated by `canSeeCrm` + RLS); download/view `GET /api/crm/documents/[docId]/download`
  (`?inline=1` for the in-app iframe viewer) → RLS-checked short-lived **signed URL**, logged as an
  `audit_log` `download`/`view` event. `PATCH /api/crm/documents/[docId]` = owner actions
  (`primary`/`note`/`delete`=soft); `DELETE` = admin hard-delete.
- **Docs v2 (Plan, 2026-07-05):** per-doc notes, multiple cover letters, owner soft-delete → admin-only
  "Deleted (history)" (view/download/hard-delete, no restore), in-app browser-native inline viewer.
  Migrations `0022`–`0024`. UI in `components/crm/documents-panel.tsx` (`canEdit` = owner|BD-Lead|admin).
- Service `lib/services/dev-profiles.ts`; routes under `app/api/crm/*`; UI at `app/(app)/crm/profiles`
  (grid + `[id]` detail + `new`), components `components/crm/{profile-form,password-panel,documents-panel}`.
- Verified: `npm run report` all-PASS + 3 E2E tests (`tests/e2e/crm.spec.ts`) + screenshots (admin sees
  password/edit/upload; BD sees only own, no password/edit; non-BD blocked from `/crm`).
- Demo data: `node scripts/seed-crm.mjs` (3 profiles).
