# 08 — Access model, account types & rules

The single reference for **who logs in as what, what each can do, and why**. Pairs with
[`.claude/rules/security.md`](../../rules/security.md) (enforcement) and
[FRD-05](../frds/FRD-05-roles-access.md) (CRM roles). Enforcement is **defense in depth**:
middleware (route gating) + **Supabase RLS** (database) + UI (hide controls) — never UI alone.

> **Credentials are NOT in this file.** Per `security.md`, plaintext passwords are never committed.
> See **§6** for where each account's password actually lives.

---

## 1. The two axes: role + CRM tier

Access = a **base role** (on `profiles.role`) **plus** CRM tiers (flags/columns that layer on top).

### Base roles (`profiles.role`)
| Role | Who | Can do | Cannot do |
|------|-----|--------|-----------|
| **super_admin** | The owner(s) / founders | **Everything** — HR + attendance + leave + **payroll, salary, compensation, payslips, login events, full audit log**, all CRM incl. **Deals** (financial). | — |
| **admin** (HR) | HR / office manager | Employees, attendance, leaves, calendar, announcements, reports, **non-financial** audit; full CRM incl. Deals. | **NOT** payroll / salary / compensation / payslips / login-events (super_admin-only). |
| **employee** | All staff (engineers, BDs, designers…) | Self-service: own attendance, leave, calendar, handbook, **own profile**. | No admin screens; no other employees' data. |

### CRM tiers (layer on top of the base role)
| Tier | How it's set | Grants |
|------|--------------|--------|
| **BD** | `department = 'Business Development'` (text) | Manage **their own** CRM: dev-profiles assigned to them, their leads / interviews / assessments (RLS: `owner_bd_id = auth.uid()`). |
| **BD Lead** | `is_bd_lead = true` | See **and manage all** BDs' CRM data (a senior editing a junior's lead) + read **non-financial** audit entries. |
| **Developer** | `is_developer = true` | Appears in the interview "given by" / assessment "completed by" pickers. Orthogonal to CRM access. |
| **Deals** (financial) | `role in (admin, super_admin)` | Deals + receiving accounts + payment methods (salary/bank data) — **admins & super-admins only; BDs never**. |

**Key rule:** a plain **employee** (e.g. an engineer) with no BD department and no flags sees **no CRM at
all**. CRM is BD/admin territory.

---

## 2. Access matrix (quick reference)

| Area | employee | BD | BD Lead | admin (HR) | super_admin |
|------|:--:|:--:|:--:|:--:|:--:|
| Own attendance / leave / profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| All employees / HR / reports | — | — | — | ✅ | ✅ |
| **Payroll / salary / payslips / login events** | — | — | — | **—** | ✅ |
| CRM Profiles / Leads / Interviews / Assessments | — | own | **all** | all | all |
| **Deals / receiving accounts (financial)** | — | **—** | **—** | ✅ | ✅ |
| Audit log | — | own CRM records | non-financial | non-financial | all |
| Interview/assessment "developer" picker (`is_developer`) | appears if flagged | — | — | — | — |

---

## 3. The owner + partner case — "Engineer + Owner (super-admin)"

The two partners are **engineers who are also the owners**. Recommended setup — **one account each**,
no dual logins:

- `role = super_admin` (full owner powers, incl. payroll/financial)
- `department = 'Engineering'` + `is_developer = true` (so they appear as **engineers** — in the org,
  attendance, and the interview/assessment developer pickers)

This is already anticipated: the seeded **Super Admin** demo carries `is_developer = true`. One profile
can legitimately be *both* a super-admin and a developer.

**Why not two accounts (a super-admin + a separate engineer profile)?** It splits identity — attendance,
audit trails, and "who did this" become ambiguous, and they'd log in twice. A single super-admin +
Engineering + is_developer profile keeps one clean identity with full powers.

> **PENDING — owner input needed:** to create the partners' *real* accounts I need, for each: **full
> name + email + (optional) mobile/CNIC/bank** (bank/CNIC go in `employee_private`, super-admin-only).
> Until then, the generic **Super Admin** account stands in. Give me those and I'll seed the two real
> owner accounts (super_admin + Engineering + is_developer).

---

## 4. Rules & the reasoning (why each exists)

1. **Financial isolation — super_admin only.** Salary, compensation, payslips, payroll runs, login
   events, and Deals hold money/PII. HR admins run people ops but must not see compensation → they're
   excluded. (`security.md`; enforced by RLS + middleware.)
2. **BD ownership scoping.** A BD sees only their **own** leads/profiles (`owner_bd_id = auth.uid()`), so
   one BD can't browse a colleague's pipeline. A **BD Lead** is the deliberate exception (oversight).
3. **Role changes are super_admin-only** (even admins can't self-escalate) — closes privilege
   escalation (`0019`, DECISIONS #27).
4. **Signup never trusts a client role** — new auth users are always `employee`; elevation is a
   deliberate admin action (`0019`, DECISIONS #28).
5. **CRM is opt-in by department/flags** — engineers/designers see no CRM; it's not their job surface.
6. **Deals stay admin/super-admin** even from BD Leads — a BD Lead runs the *pipeline*, not the *money*.

---

## 5. Login demos (developer convenience)

The login screen shows **quick demo buttons only in development** (`NODE_ENV !== 'production'`; hidden in
prod so demo creds never ship). They one-click-fill each role so you can compare views:

| Button | Identity | View you get |
|--------|----------|--------------|
| Super Admin | `super.admin@softonoma.com` | everything |
| Admin / HR | `admin@softonoma.com` | HR ops, no payroll/financial |
| **BD Lead (Fatima)** | `fatima.sultan` | all BDs' CRM (oversight) |
| **BD (Shaiza)** | `shaiza.maheen` | her own CRM only |
| **Engineer (Muzammal)** | `muzammil.faiz` | no CRM (employee self-service) |

(Employees log in with a **username** `first.last`; the two admin accounts use **email**.)

---

## 6. Where credentials actually live (not here)

Per `security.md`, this committed doc **does not** contain plaintext passwords. To find/manage them:

- **Admin passwords** (super_admin, admin/HR): defined in `scripts/seed.mjs` and surfaced by the
  **dev-only demo buttons** in `app/login/page.tsx` (which auto-fill them on click in dev).
- **Employee/BD/engineer passwords:** convention **`Softonoma@<employee_code>`** (the `employee_code`
  is on `profiles`, non-secret). The portal-visible copy is in `employee_credentials` (RLS:
  admin/super-admin/self only — see DECISIONS #21).
- **For your own secure copy:** keep a **local, git-ignored `CREDENTIALS.md`** (already git-ignored +
  write-blocked by a hook) or a password manager. I can't write or print passwords into the repo.

> ⚠️ **Production hardening:** the `Softonoma@<employee_code>` convention is **derivable** — `employee_code`
> is readable by any authenticated user (`profiles` read policy), so a logged-in employee can compute a
> colleague's password. Fine for an internal launch, but **before going external, retire the convention
> for individually-set, non-derivable passwords** (and reconsider storing the plaintext in
> `employee_credentials`, DECISIONS #21). Admin passwords are already random.

---

## 7. How to change access (operational)

- **Promote a BD → BD Lead:** set `is_bd_lead = true` on their `profiles` row (admin/super-admin; the
  employee editor or a one-off update). Reversible.
- **Flag a developer:** set `is_developer = true` (so they show in the interview/assessment pickers).
- **Make someone HR admin:** `role = 'admin'`. **Make an owner:** `role = 'super_admin'` (super-admin
  action only).
- **CRM access for a new BD:** set `department = 'Business Development'`.
- Demo/test data (dev-profiles, flags, the demo lead) is seeded by `scripts/seed-crm.mjs`, now chained
  into `npm run seed:test`.
