# CRM · Roles, Departments & Access

The access foundation the whole CRM sits on. Requirements: [FRD-05](../../frds/FRD-05-roles-access.md).
Delivery: Plan 01 (built with Profiles). Schema: `../../../database/database.md`.

## The model
Base roles stay `employee | admin | super_admin` (`profiles.role`, `auth_role()`). CRM access adds a
**department** dimension + two **person flags**.

- **`departments`** lookup + `profiles.department_id` FK (replaces the old free-text `department`;
  migrate existing values in; "Business Development" is the BD row). Typo-proof; RLS keys on it.
- **`is_bd_lead`** (flag on the person): elevated BD — view **and manage** all BDs' CRM data + deals.
- **`is_developer`** (flag on the person): selectable as the interview/assessment developer (Engineering
  employees **and** the founder admin/super-admin accounts).
- **Helpers** (security-definer, like `auth_role()`): `auth_is_bd()` (BD-or-admin), `auth_is_bd_lead()`.

## Access matrix
| Area | BD | BD Lead | Admin | Super-admin | Other |
|------|----|---------|-------|-------------|-------|
| Profiles | own (no password) | all BDs' | all | all | — |
| Profile password | — | — | ✓ | ✓ | — |
| Interviews / Assessments / Leads | own (view+manage) | all BDs' (view+manage) | all | all | — |
| Deals | — | view all (financial scope FRD-05 Q6) | all | all | — |
| Activity Log | own-record history | scoped (CRM/ops) | scoped (CRM/ops) | all | — |

- **Admin/super-admin = full superset of BD abilities** on any BD's data. **Deals = admin/super-admin
  only** (BD Lead per FRD-05 Q6). **Payroll/financial audit = super-admin only.**
- Founders: single admin/super-admin account each, also `is_developer`.

## Enforcement (three layers)
1. **Middleware** (`lib/supabase/middleware.ts`): gate `/crm/*` (BD-or-admin), `/crm/deals` (admin/
   super only); inactive users already blocked. Fetch `department` in the existing select.
2. **RLS**: owner-scoped for BDs (`owner_bd_id = auth.uid()`), `auth_is_bd_lead()` for cross-BD, admin/
   super unrestricted; deals/secrets locked down. Every CRM table ships RLS in its migration.
3. **UI/nav** (`lib/nav.ts` → `navForRole(role, department)`): CRM nav for BD + admin only.

## Key flows
Promote a BD → BD Lead (set `is_bd_lead`). Flag a user `is_developer` so they're pickable as an
interview/assessment developer. Assign a profile's owner (a BD).

## As-built (Plan 01, 2026-07-01)
- `auth_is_bd()` is keyed on the **text `department`** (`= 'Business Development'`), not the FK — so
  middleware, nav, and RLS read ONE source and never drift vs a one-time `department_id` backfill + the
  re-seed flow. The `departments` lookup + `department_id` exist as forward structure; a follow-up will
  wire the employee editor/seed to write `department_id`, then flip `auth_is_bd()` to the join.
- `guard_profile_privileged_cols()` (BEFORE UPDATE on profiles) closes the self-update escalation hole:
  non-admins can't change role/status/department/`is_bd_lead`/`is_developer` (avatar self-update still works).
- CRM lives under `/crm/*`; a single `/crm/profiles` route serves everyone (RLS scopes rows) — no
  separate `/my-profiles`. Helpers: `lib/crm/access.ts` (client+server safe: `canSeeCrm`, `isBdLead`,
  `canSeeDeals`); nav via `navForRole(profile)`.
