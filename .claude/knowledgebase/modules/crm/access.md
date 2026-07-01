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
