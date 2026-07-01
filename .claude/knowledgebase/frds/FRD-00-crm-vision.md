# FRD-00 — CRM Vision & Module Map

| | |
|---|---|
| **Status** | In Review |
| **Module** | CRM (umbrella / index) |
| **Created** | 2026-06-30 |
| **Updated** | 2026-06-30 |
| **Plan** | — |
| **Changelog refs** | 2026-06-30 (CRM expansion kickoff; CRM business model + first batch) |

> Softonoma is expanding the portal from an HR/attendance/leave/payroll app into a **business CRM** that
> runs the company's staffing/services operation. This umbrella FRD captures the business model, maps the
> CRM into modules (each its own FRD), and records the **cross-cutting** decisions every module shares.

---

## 1. The business model (what the CRM must support)
Softonoma is a software **staffing / services** business:
- It maintains marketable **developer profiles** — one real developer can have several, one per stack
  (FS/BE/FE/SEO/DE/WordPress/AI-ML/MERN…). Each profile has its own contacts, resumes, and login.
- **Business Developers (BDs / VDs)** are assigned profiles (≈2 each, max 3) and **apply on those
  profiles' behalf** to job posts across LinkedIn/Indeed/etc.
- Responses become **interviews** and **assessments**, tracked per BD (today: monthly Google Sheets).
  When a developer attends round 1 of a lead, that same developer takes the later rounds.
- When a lead clears its interviews/assessments it becomes a **closed deal**; the engagement details
  (designation, joining date, selected profile, working developer, salary, payment method, receiving
  account, profile DOB) + documents are recorded. **Deals are admin/super-admin-only** (sensitive).

Today this is scattered across Drive folders + Sheets (see the 8 screenshots in the 2026-06-30 changelog
entry). The goal: **centralise** it on the portal with proper roles, access control, search, and analytics.

## 2. Goals & non-goals
**Goals:** one platform for profiles + resumes + interviews + assessments + deals; correct visibility
(BDs see only their own work; admin sees all; deals admin-only); BD performance visibility; clean
filtering; documents stored on-platform.
**Non-goals:** automated job-applying; an external client-facing portal; replacing the HR modules.

## 3. CRM module map (6 FRDs)
| FRD | Module | Status | Plan / order | Notes |
|-----|--------|--------|-------------|-------|
| [01](FRD-01-profiles.md) | **Profiles & Resumes** | Promoted | **Plan 01** (1st, with 05) | Foundation everything references. |
| [05](FRD-05-roles-access.md) | **Roles, Departments & CRM access** | Promoted | **Plan 01** (with 1st) | BD-department gate: middleware + nav + RLS helpers (`auth_is_bd`, `auth_is_bd_lead`). Cross-cutting. |
| [02](FRD-02-interviews.md) | **Interviews** | Promoted | **Plan 02** (2nd) | Per-BD interview grid; round+outcome; ties to a lead. |
| [03](FRD-03-assessments.md) | **Assessments** | Promoted | **Plan 02** (2nd) | Per-BD assessment grid; duration; uploaded docs. |
| [04](FRD-04-leads-deals.md) | **Leads & Deals** | Promoted | **Plan 02** (leads) + **03** (deals, 3rd) | Leads (BD-own) + disqualification; deals admin-only + accounts/methods. |
| [06](FRD-06-activity-log.md) | **Activity Log & Audit** | Promoted | **Plan 04** (cross-cutting) | Comprehensive, readable change-history across all modules (HR + CRM). Extends the existing audit backbone. |

**Owner's chosen build order:** Profiles first (with the access foundation from FRD-05), then Interviews +
Assessments, then Leads/Deals.

## 4. Cross-cutting decisions (apply to EVERY CRM module)
- **Naming collision:** the existing `profiles` table is the auth/user table (load-bearing everywhere).
  CRM developer profiles = **`dev_profiles`**. Never reuse `profiles` for CRM data.
- **A profile is a standalone marketing identity** (no person link); one person can run many profiles
  (resolved 2026-06-30, FRD-01 Q1). **BDs (profile owners) = employees** (FK → `profiles.id`). The
  **developer who gives an interview / completes an assessment is assigned per interview/assessment row**
  (FRD-02/03) and may vary — whether those developers must be employees is FRD-02 Q4 / FRD-03 Q3.
- **Access model:** BD-department employees see the CRM; admin/super-admin see all; other employees see
  nothing; **Deals = admin/super-admin only**. Enforced in three layers (middleware + RLS + UI) per
  `rules/security.md`. The "BD-or-admin" RLS helper and the CRM route/nav gate are **new** (FRD-05).
- **Same portal, new "CRM" section** (new nav group + routes in this Next.js app; shares auth/roles/employees).
- **Storage:** sensitive CRM docs (resumes, deal files) go in a **private** bucket with signed URLs — not
  the public `avatars` bucket.
- **Audit:** reuse the `record_audit()` trigger on CRM tables; add CRM entity names to the Logs panel filter.
- **Architecture reuse:** logic in `lib/services/*` (injected Supabase client), thin routes/UI, new tables
  ship with RLS in the same migration, follow `reference/01-architecture-and-conventions.md` + `rules/conventions.md`.

## 12. Open questions (umbrella-level)
- [ ] Department modelling: keep `profiles.department` as locked free-text (`'Business Development'`) vs a
  `departments` lookup table? (Detailed in [FRD-05](FRD-05-roles-access.md).)
- [x] Developer identity (FRD-01 Q1) — RESOLVED 2026-06-30: profiles are standalone; developer assigned per interview/assessment.
- [x] Is "Moon" (CEO / ceosoftonoma) a BD? **RESOLVED 2026-07-01: treated as a BD** — profile owners are
  always BD-department members; Moon is set up as a BD.

---

## Change Log
- 2026-06-30 — created at kickoff.
- 2026-06-30 — populated vision, business model, 5-module map, build order, and cross-cutting decisions
  after the first requirements batch + codebase recon; set to In Review.
