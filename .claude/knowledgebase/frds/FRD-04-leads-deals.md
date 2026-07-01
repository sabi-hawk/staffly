# FRD-04 — Leads & Deals

| | |
|---|---|
| **Status** | Promoted |
| **Module** | CRM · Leads & Deals |
| **Created** | 2026-06-30 |
| **Updated** | 2026-07-01 |
| **Plan** | [02-crm-activity](../../plans/done/02-crm-activity/plan.md) (leads) + [03-crm-deals](../../plans/upcoming/03-crm-deals/plan.md) (deals) |
| **Changelog refs** | 2026-06-30 (CRM business model + first batch) |

> A **lead** is one job opportunity (company + role) a BD is pursuing for a profile — the thread that
> groups its interview rounds and assessments. When it clears, it becomes a **closed deal** with the
> engagement details + documents. Replaces the Drive `Deals/<Company>/` folders (documents + a text file
> of engagement details). **Deals are admin/super-admin ONLY** — critical business/financial info.

---

## 1. Background & context
Today closed deals live as Drive folders per company, each with submitted documents (PDFs/images/notes)
and a text file recording: designation, joining date, selected profile, the developer who will work,
salary, payment method, **receiving account name**, and the profile's DOB. Leads-in-progress are implicit
in the interview/assessment sheets.

## 2. Goals & non-goals
**Goals:** group a lead's interviews + assessments; track lead status to closure; record deal details +
documents; keep all of it **admin/super-admin only**. **Non-goals:** the interview/assessment logging
itself (FRD-02/03); invoicing/payroll of the deal (future).

## 3. Users & roles
- **BD**: sees/manages **their own leads** (pipeline) — the record that groups their interviews +
  assessments; can disqualify a lead (with reason). **BDs never see Deals.**
- **Admin/super-admin**: full CRUD on all leads **and** deals (deals are admin/super-admin only).
- Other employees: none.

## 4. Functional requirements
- **FR-1** **Lead** entity: company, role/designation, the profile, the assigned BD, status (open /
  interviewing / assessment / won / lost / **disqualified**), linked interviews
  ([FRD-02](FRD-02-interviews.md)) + assessments ([FRD-03](FRD-03-assessments.md)).
- **FR-1b** **Disqualify a lead ("Not a lead / False lead").** A BD (and admin) can mark a lead
  **disqualified** with a **required feedback reason** (why it wasn't a real lead — e.g. fake job, low
  pay, unpaid collaboration, plus free-text). A disqualified lead is **excluded from that BD's lead
  count / performance analytics**, but the record + reason are retained (not deleted) for audit.
  Reversible by admin (re-qualify) with the change audited. Reason category set: see Q6.
- **FR-2** Mark a lead **closed/won → create a Deal** capturing: designation, **joining date**, **selected
  profile**, **developer who will work**, **salary**, **profile DOB**, plus **how we get paid**:
  - a **receiving account** picked from a managed list (bank name, account number, account holder — e.g.
    the owner or his brother);
  - a **payment method / channel** picked from a **dynamically extendable** list (Direct to bank /
    Payoneer / Wise / Other).
- **FR-2b** Admin manages the **receiving accounts** and **payment methods** lists (add/edit/deactivate).
  Receiving-account details are **financial/sensitive → admin/super-admin only**.
- **FR-3** **Deal documents**: upload PDFs/images/notes (private bucket), listed on the deal.
- **FR-4** Admin views: leads pipeline (by status) + deals list, filterable (BD, profile, company, date),
  paginated, searchable. Empty states.
- **FR-5** Mutations audited; deal financial fields live where only admin/super-admin can read (RLS).

## 5. Data model (high level)
| Entity | Key fields | Notes |
|--------|-----------|-------|
| `leads` | id, company, role, dev_profile_id, owner_bd_id, status (open/interviewing/assessment/won/lost/**disqualified**), disqualified_category (fake_job/low_pay/unpaid_collab/other), disqualified_note (text), disqualified_by (employee), disqualified_at, created_at, updated_at | groups interviews + assessments (their `lead_id`). Disqualified (BD+admin) leads excluded from BD analytics; retained + audited; admin can re-qualify. |
| `deals` | id, lead_id, designation, joining_date, dev_profile_id, working_developer (employee), salary, receiving_account_id, payment_method_id, profile_dob, status, created_at, updated_at | **admin/super-admin-only RLS.** Financials here. FKs → `receiving_accounts`, `payment_methods`. |
| `receiving_accounts` | id, holder_name (owner/brother/…), bank_name, account_number, notes, active, created_at, updated_at | Managed list of company accounts. **admin/super-admin only** (sensitive financial). |
| `payment_methods` | id, name (Direct bank / Payoneer / Wise / Other …), active, sort_order | **Dynamically extendable** lookup, admin-managed. |
| `deal_documents` | id, deal_id, label, file_path, uploaded_by, created_at | private `crm-docs` bucket. |

## 6. Permissions & security
- `deals` + `deal_documents`: **super-admin/admin only** (pattern like payroll/`employee_private`). BDs
  excluded entirely. `leads` visibility: see Q1.
- Salary, payment method, receiving account = sensitive financial data → never to BDs/employees; no PII in logs.

## 7. Screens & UX
- **CRM → Leads** (admin): pipeline by status. **CRM → Deals** (admin): list + detail with documents.
- Deal detail: engagement fields + document upload/download (signed URLs). Back link, toasts.

## 8. Business rules
- A deal is created only from a won lead. **Closing is manual** (admin/super-admin), anytime — no system
  precondition on rounds being resolved.
- Receiving accounts + payment methods are picked from **managed lists** (resolved Q3), not free text.

## 9. Integrations & dependencies
- Depends on [FRD-01](FRD-01-profiles.md), [FRD-02](FRD-02-interviews.md), [FRD-03](FRD-03-assessments.md),
  [FRD-05](FRD-05-roles-access.md). Possible future tie-in to payroll/invoicing.

## 10. Acceptance criteria
- [ ] Admin can create a lead, attach its interviews/assessments, and close it into a deal.
- [ ] A deal records all engagement + financial fields and supports document upload/download.
- [ ] No BD or non-admin employee can see any deal data (RLS-verified).
- [ ] Leads/deals are filterable and paginated for admin.
- [ ] A lead can be marked **disqualified** with a required reason; it's excluded from the BD's lead count
  but retained + audited; admin can re-qualify (also audited).

## 12. Open questions
- [x] **Q1** Lead vs deal visibility. **RESOLVED 2026-07-01:** a **BD sees/manages their own leads**
  (`owner_bd_id = auth.uid()`); **Deals remain admin/super-admin only**. So `leads` RLS = BD-own + admin;
  `deals`/`deal_documents` = admin/super only.
- [x] **Q2** Closing rule. **RESOLVED 2026-07-01:** **manual** — admin/super-admin marks a lead won →
  creates the deal **anytime**, no system precondition on rounds being resolved.
- [x] **Q3** Payment/account. **RESOLVED 2026-07-01:** two managed lists — **`receiving_accounts`** (bank
  name, account number, holder name; admin-only, sensitive) and a **dynamically extendable
  `payment_methods`** lookup (Direct bank / Payoneer / Wise / Other). A deal references one of each.
- [x] **Q4** Working developer vs profile. **RESOLVED 2026-07-01 (default):** they **can differ** — the
  developer who ends up working the deal isn't necessarily the profile's nominal person; both recorded
  independently.
- [x] **Q5** Deal downstream. **RESOLVED 2026-07-01:** v1 just **records** the deal (reportable); it does
  **not** auto-feed commissions/payroll/invoicing. Wiring BD-commission-from-deals is a later, separate piece.
- [x] **Q6** Disqualification. **RESOLVED 2026-07-01:** **preset category** (Fake job / Low pay / Unpaid
  collaboration / Other) **+ a free-text note** (both required); disqualifiable by **BD + admin**; admin
  can re-qualify; all audited.

## 13. Out of scope / future
- Invoicing/billing the client; recurring payments; BD commission auto-calc from deals.

---

## Change Log
- 2026-06-30 — created (Draft skeleton) from the kickoff batch + deal-folder description.
- 2026-07-01 — added lead disqualification (false-lead) + payment/account managed lists; Q1–Q6 resolved
  (BD sees own leads, deals admin-only; manual close; managed accounts + extendable methods; working-dev
  can differ; downstream record-only; disqualification categories) → **status = Approved**.
