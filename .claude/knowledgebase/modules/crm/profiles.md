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
- **`dev_profile_documents`** — resume | cover_letter; `is_primary` (exactly one primary resume);
  files in private `crm-docs` bucket. Multiple secondary resumes (FS/FE/BE/Python variants); one cover
  letter per profile.

## Rules
- Exactly **one primary resume** per profile when resumes exist (new primary unsets the old).
- Password readable only by admin/super-admin (RLS + API + UI mask); BDs never see it (owner applies it
  on the BD's machine himself).
- Label convention `"<name> - <stack>"`. Status is Active/Inactive; banned = a note, not a status.

## Permissions
- Admin/super-admin: full CRUD incl. password; assign/clear owner; manage resumes/cover letter.
- **BD:** read-only view of profiles where `owner_bd_id = auth.uid()` — contacts/DOB/resumes/cover
  letter — **excluding password**; can download resumes.
- **BD Lead:** all BDs' profiles (view + manage), still no password.
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
