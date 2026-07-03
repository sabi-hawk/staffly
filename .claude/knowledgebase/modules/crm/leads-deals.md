# CRM · Leads & Deals

Requirements: [FRD-04](../../frds/FRD-04-leads-deals.md) + **[FRD-07](../../frds/FRD-07-crm-leads-redesign.md)** (leads redesign). Delivery: Plan 02 (leads) + Plan 03 (deals) + the FRD-07 phases (migration 0020).
Schema: `../../../database/database.md`.

## What it is
- A **lead** = one company/opportunity thread a BD is pursuing — groups its
  [interviews](interviews.md) + [assessments](assessments.md). Surfaced as a **card/thread view** in the
  **CRM Leads hub** (one page, tabs: Leads / Interviews / Assessments; type-first Add flow — FRD-07).
- A **deal** = a landed lead, with engagement + financial details + documents. **Admin/super-admin only.**

## Data model
- **`leads`** — id, company, role, `dev_profile_id`, `owner_bd_id`, **status** (FRD-07:
  `in_progress|on_hold|closed|rejected|dismissed` — closed = won; rejected/dismissed require a reason),
  **feedback**, and the legacy `disqualified_category|note|by|at` (now the **dismiss** reason).
  Interviews/assessments carry `lead_id`. A lead going **`closed`** fires an admin `crm_alerts` row (no
  auto-deal). *Old statuses migrated in 0020: open/interviewing/assessment→in_progress, won→closed,
  lost→rejected, disqualified→dismissed.*
- **`deals`** — id, `lead_id`, designation, joining_date, `dev_profile_id`, **working_developer**
  (employee; may differ from the profile's nominal person), salary, `receiving_account_id`,
  `payment_method_id`, profile_dob, status, timestamps.
- **`receiving_accounts`** — managed list (holder_name = owner/brother/…, bank_name, account_number,
  notes, active). **admin/super-admin only** (sensitive financial).
- **`payment_methods`** — dynamically extendable lookup (Direct bank / Payoneer / Wise / Other).
- **`deal_documents`** — private `crm-docs` bucket (signed-URL, download-logged).

## Rules
- **Disqualify ("not a lead"):** BD **or** admin marks a lead `disqualified` with a required category +
  note. Excluded from that BD's lead-count/performance analytics; **retained + audited**; admin can
  re-qualify (audited).
- **Closing is manual** (admin/super-admin), **anytime** — no precondition that rounds are resolved. A
  deal is created only from a won lead.
- Receiving account + payment method are picked from **managed lists** (not free text).
- v1: a deal is just **recorded** — it does **not** auto-feed commissions/payroll/invoicing (future).

## Permissions
- **Leads:** BD sees/manages **own** (`owner_bd_id = auth.uid()`); BD Lead all; admin/super all.
- **Deals + deal_documents + receiving_accounts:** **admin/super-admin only** (BD Lead financial scope =
  FRD-04/FRD-05 Q6). Payment methods lookup: read by CRM users, write admin.
- Salary/account = sensitive; never to BDs; no PII in logs/screenshots.

## Screens
`CRM → Leads` (BD own pipeline by status; admin/BD-Lead all) with disqualify action. `CRM → Deals`
(admin): list + detail with documents; "close → deal" action on a won lead; manage accounts/methods.

## As-built (Plan 03, 2026-07-02) — **Deals shipped**
- Tables `deals`, `deal_documents`, `receiving_accounts`, `payment_methods` (migration `0014`).
  **admin/super-admin only** (payment_methods lookup readable by any authenticated). Salary = numeric PKR
  (shown via `formatPKR`). Deal docs in private `crm-docs` bucket (`deals/<id>/…`), signed-URL + audit-logged.
- UI: `/crm/deals` (list), `/crm/deals/new` (prefill from `?lead=`), `/crm/deals/[id]` (detail + docs +
  edit), `/crm/deals/settings` (manage receiving accounts + payment methods). Admin-only **"Create deal
  from this lead"** button on the lead detail. Nav "Deals" shown only to admin/super (`canSeeDeals`).
- Service `lib/services/crm-deals.ts`; routes `app/api/crm/{deals,deal-documents,receiving-accounts,payment-methods}/*`.
- Deferred (FRD-04 §13): BD-commission-from-deals, client invoicing.

## As-built (Plan 02, 2026-07-01) — **Leads shipped**
- Table `leads` (migration `0013`), owner-scoped RLS. Status open/interviewing/assessment/won/lost/
  **disqualified**; disqualify (BD+admin) sets category + note (`disqualify-panel.tsx`), re-qualify by
  the owner/admin; both audited. UI: `/crm/leads` (pipeline + new), `/crm/leads/[id]` (info + disqualify
  + nested interviews/assessments via `lead-activity.tsx` + edit). Service/routes: `crm-activity.ts`,
  `app/api/crm/leads/*`. **Deals/accounts/payment-methods remain Plan 03.**
