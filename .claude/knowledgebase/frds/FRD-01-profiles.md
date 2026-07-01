# FRD-01 — Profiles & Resumes

| | |
|---|---|
| **Status** | Promoted |
| **Module** | CRM · Profiles |
| **Created** | 2026-06-30 |
| **Updated** | 2026-07-01 |
| **Plan** | [plans/done/01-crm-profiles-foundation](../../plans/done/01-crm-profiles-foundation/plan.md) |
| **Changelog refs** | 2026-06-30 (CRM business model + first batch) |

> A central registry of **marketable developer profiles**. One real developer can have several profiles
> (one per stack/specialisation — FS, BE, FE, SEO, DE, WordPress, AI/ML…). Each profile carries its own
> contact/identity data, an **owner** (the BD currently working it), a **private account password**
> (admin-only, never shown to BDs), and a set of **resumes** (one primary + many secondary) plus a cover
> letter — all stored on-platform. This replaces the Drive `Profiles/` folder + the `Profiles-Credentials`
> Google Sheet (screenshots in the 2026-06-30 changelog entry).

---

## 1. Background & context
Today profiles live as Drive folders (`Softonoma/Profiles/<Name> - <Stack>/`, each holding a resume PDF)
plus a `Profiles-Credentials` sheet (Profile, owner, email, resume, cover letter, mobile, DOB, password,
status notes like "LinkedIn banned"). BDs apply on these profiles' behalf. We are centralising this into
the portal so the data, resumes, and assignments live in one place with proper access control.

**Critical integration facts (from the codebase recon + owner clarification 2026-06-30):**
- The existing `profiles` table is the **auth/user** table, referenced at every layer. The CRM table
  MUST be named **`dev_profiles`** (TS type `DevProfile`) to avoid catastrophic join/RLS/type collisions.
- **A profile is a standalone marketing identity — it is NOT linked to any real person.** One person
  (employee, contractor, or the owner himself) can be behind many profiles. So `dev_profiles` has **no
  developer/person FK.** The only person attached to a profile is its **owner BD**.
- The **developer who gives an interview / completes an assessment is assigned per interview/assessment
  row** (and can differ across rounds/companies) — that lives in FRD-02/03, not here.
- Sensitive docs need a **private** Storage bucket (the `avatars` bucket is public). Resume access via
  server-generated signed URLs.

## 2. Goals & non-goals
**Goals**
- One source of truth for every dev profile + its resumes/cover letter/contact data.
- Admin/super-admin manage profiles end to end, including the private account password.
- **Assign a profile to a BD** (set its owner); a BD sees only their assigned profiles' data + resumes,
  **never the password**.
- Multiple resumes per profile: exactly one **primary**, any number of **secondary** (e.g. a FS person
  also has FE-only, BE-only, Python variants).

**Non-goals (covered by other FRDs)**
- Interview tracking → [FRD-02](FRD-02-interviews.md). Assessment tracking → [FRD-03](FRD-03-assessments.md).
- Closed-deal records → [FRD-04](FRD-04-leads-deals.md).
- The department/role access machinery itself → [FRD-05](FRD-05-roles-access.md) (this FRD consumes it).
- Auto-applying to job posts (out of scope entirely).

## 3. Users & roles
| Role | Can do |
|------|--------|
| **Super-admin / Admin** | Full CRUD on `dev_profiles`; upload/manage resumes & cover letters; set/clear the **owner (BD)**; view + set the **account password**. See all profiles (assigned or not). |
| **BD** (Business-Development employee) | **Read-only** view of profiles where they are the owner — including contact data, DOB, resumes, cover letter — **excluding the password**. Cannot see unassigned or other BDs' profiles. |
| **Other employees** | No access to the CRM at all (enforced by [FRD-05](FRD-05-roles-access.md)). |

> Password handling intent: the owner applies the account password on the BD's machine himself; BDs must
> never be able to read it (UI + API + RLS all enforce). See Q2 on admin-vs-super-admin visibility.

## 4. Functional requirements
- **FR-1** Maintain `dev_profiles` with: developer (real person), stack/specialisation, display label
  (`<name> - <stack>`), owner BD (or Unassigned), email, mobile, DOB, status, notes.
- **FR-2** A profile has **0..N resumes**, exactly **one primary** when any exist, plus an optional cover
  letter. Each resume has a label (e.g. "Full Stack", "Frontend", "Python").
- **FR-3** Admin can **assign/reassign** a profile's owner BD (including back to Unassigned).
- **FR-4** Admin can set/update/clear the profile's **account password**; it is stored apart from the
  profile row and is never returned to a BD or any non-admin (defense in depth: RLS + API + UI mask).
- **FR-5** Resume/cover-letter files are stored in a **private** bucket; download is via a short-lived
  **signed URL** generated server-side after a role/ownership check.
- **FR-6** **Profiles list** (admin): paginated, filterable by owner BD / stack / status, searchable by
  name/email; shows name, stack, owner, email, mobile, status, resume count. Empty state.
- **FR-7** **Profile detail** (admin): all fields; password masked with reveal + copy; resume list with
  upload/download/set-primary/delete; cover-letter upload/download; owner assignment control.
- **FR-8** **BD "My Profiles"**: list + detail of owned profiles, identical to FR-7 **minus the password**
  and minus edit controls (read-only; download resumes allowed).
- **FR-9** All `dev_profiles` mutations are **audited** (reuse the `record_audit()` trigger); CRM entity
  names added to the Logs panel filter. Password reads should not leak into audit `before/after` payloads.
- **FR-10** A profile may be marked inactive / "LinkedIn banned" (status) without deletion (history kept).

## 5. Data model (high level)
| Entity | Key fields | Relationships / notes |
|--------|-----------|----------------------|
| `dev_profiles` | id, name, stack_id, label, owner_bd_id (null=Unassigned), email, mobile, dob, status (active\|inactive), notes, created_at, updated_at | **No person/developer FK** (a profile is a standalone identity). owner_bd_id → `profiles.id` (a BD). stack_id → `dev_stacks`. One email + one mobile. "LinkedIn banned" lives in `notes`. |
| `dev_stacks` | id, name, sort_order, active | Extendable lookup (FS/BE/FE/SEO/WordPress/DE/AI-ML/MERN/…). Admin-managed. |
| `dev_profile_secrets` | dev_profile_id (PK/FK), account_password, updated_by, updated_at | 1:1 with dev_profiles. **admin + super-admin only** (resolved Q2). Pattern mirrors `employee_private`/`employee_credentials`. Never readable by BDs. |
| `dev_profile_documents` | id, dev_profile_id, doc_type (resume \| cover_letter), label, is_primary, file_path, uploaded_by, created_at | N:1 to dev_profiles. Exactly one `is_primary` resume per profile. Files in private `crm-docs` bucket. |

**RLS sketch (to finalise in FRD-05 + the plan):**
- `dev_profiles`, `dev_profile_documents`: admin/super-admin → all; BD → rows where `owner_bd_id = auth.uid()`; others → none.
- `dev_profile_secrets`: **admin + super-admin only**; BD → none.
- `dev_stacks`: read by any CRM user; write admin/super-admin.

## 6. Permissions & security
- Defense in depth: middleware (CRM path gating, FRD-05) + RLS (above) + UI (hide password & edit
  controls for BDs).
- Password lives in a **separate table**, never inline on `dev_profiles`, so a stray `select *` can't leak it.
- Private bucket + signed URLs for all resume/cover-letter access; validate uploads by MIME (PDF/DOC/DOCX,
  maybe images) and size.
- No real PII/passwords in logs, tests, or screenshots — synthetic data only.

## 7. Screens & UX
- **CRM → Profiles** (admin): grid (FR-6) using the existing table + `Pagination` + filters pattern.
- **CRM → Profiles → [profile]** (admin): detail/edit (FR-7); back link; toast feedback on mutations.
- **CRM → My Profiles** (BD): read-only grid + detail (FR-8).
- **Add / Edit profile** (admin): form with owner dropdown (BDs), stack selector, resume/cover-letter upload.
- Light theme + shadcn-style primitives, consistent with the rest of the portal.

## 8. Business rules
- Exactly **one primary resume** per profile when resumes exist; setting a new primary unsets the old.
- A BD can read **only** profiles they own; password is unreadable by anyone who isn't admin/super-admin.
- Display label convention: `"<name> - <stack>"` (matches the sheet, e.g. "Ali Ahmad - BE").
- Reassigning owner doesn't delete history; status changes (e.g. banned) keep the row.

## 9. Integrations & dependencies
- **Depends on [FRD-05](FRD-05-roles-access.md)** for the BD-department gate (middleware, nav, the
  BD-or-admin RLS helper). FRD-01's first build slice will likely land alongside FRD-05's foundation.
- Referenced by **FRD-02/03/04** (interviews, assessments, deals all point at a `dev_profile`).
- Reuses: `record_audit()` (audit), the avatar-upload route pattern (for the new CRM upload route),
  `lib/pagination.ts` + table/pagination components, the `lib/services/*` injected-client pattern.

## 10. Acceptance criteria
- [ ] Admin can create a profile, set its owner, upload a primary + secondary resumes + a cover letter, and set a password.
- [ ] A BD logged in sees only their assigned profiles, can download resumes, and the password is nowhere in the UI or any API response.
- [ ] A non-BD employee cannot reach the CRM/profiles at all (redirected).
- [ ] RLS blocks a BD from reading another BD's profile or any `dev_profile_secrets` row (verified by an RLS test).
- [ ] Resume downloads work via signed URL and fail without a valid session/role.
- [ ] Profiles list paginates, filters by owner/stack/status, and searches by name/email.
- [ ] All profile mutations appear in the super-admin Logs panel; password value never appears in audit payloads.

## 11. Reporting / analytics
- Count of profiles per owner BD and per stack; count of Unassigned profiles. (Deeper BD-performance
  analytics live in [FRD-02](FRD-02-interviews.md)/[FRD-05](FRD-05-roles-access.md).)

## 12. Open questions
- [x] **Q1 (structural) — developer identity. RESOLVED 2026-06-30.** A profile is a **standalone
  marketing identity with NO person/developer link** (one person can be behind many profiles). The only
  person on a profile is its **owner BD**. The developer who gives interviews / completes assessments is
  assigned **per interview/assessment row** (FRD-02/03), and may vary by round/company.
- [x] **Q2 — password visibility. RESOLVED 2026-06-30:** **admin + super-admin** can view/set; BDs never.
  Stored in `dev_profile_secrets`.
- [x] **Q3 — DOB source. RESOLVED 2026-06-30 (default):** stored per-profile on `dev_profiles` (profiles
  may use a tailored DOB). Revisit if you want it derived elsewhere.
- [x] **Q4 — stack list. RESOLVED 2026-06-30:** an **extendable lookup** (`dev_stacks`), admin-managed.
- [x] **Q5 — status. RESOLVED 2026-06-30:** simple **Active / Inactive**. "LinkedIn banned" is captured
  as a free-text **note** on the profile (not a status value).
- [x] **Q6 — contacts. RESOLVED 2026-06-30:** **one email + one mobile** per profile.
- [x] **Q7 — Phase 2 sheet. RESOLVED 2026-07-01:** ignore it — the owner created it but it's unused.
  No data to carry over.
- [x] **Q8 — cover letter. RESOLVED 2026-06-30:** **one cover letter per profile** (`doc_type=cover_letter`).

## 13. Out of scope / future
- Bulk import from the existing Google Sheet/Drive (could be a later one-off migration script).
- Auto-generating resume variants. Versioning of a resume file over time.

---

## Change Log
- 2026-06-30 — created from the CRM kickoff batch + codebase recon; set to In Review with 8 open questions.
- 2026-06-30 — **Q1 resolved**: profile is a standalone identity with no person/developer FK; developer
  assignment lives only on interview/assessment rows. Removed `developer_employee_id` from the data model.
- 2026-06-30 — **Q2/Q3/Q4 resolved**: password = admin + super-admin (`dev_profile_secrets`); DOB
  per-profile; stack = extendable `dev_stacks` lookup.
- 2026-06-30 — **Q5/Q6/Q8 resolved**: status = Active/Inactive (banned → note); one email + one mobile;
  one cover letter per profile. **Only Q7 (Phase 2 sheet) remains** before Approved.
- 2026-07-01 — **Q7 resolved** (Phase 2 sheet ignored). All questions closed → **status = Approved**.
