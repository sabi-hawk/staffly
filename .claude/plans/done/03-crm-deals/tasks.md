# Tasks — Plan 03: CRM Deals (admin/super-admin only)

Financial data. Deals/deal_documents/receiving_accounts = admin+super only; payment_methods = read-any,
write-admin. Middleware already gates `/crm/deals` to admin/super.

## Slice A — Accounts & payment methods
- [ ] `0014`: `receiving_accounts` (holder_name, bank_name, account_number, notes, active) admin-only;
  `payment_methods` (name, active, sort_order) +seed (Direct bank/Payoneer/Wise/Other). RLS + audit + updated_at.
- [ ] routes + a management UI (`/crm/deals/settings`).

## Slice B — Deals + documents
- [ ] `0014`: `deals` (lead_id, designation, joining_date, dev_profile_id, working_developer, salary,
  receiving_account_id, payment_method_id, profile_dob, status) + `deal_documents` (crm-docs). RLS admin-only.
- [ ] service `lib/services/crm-deals.ts`; routes `/api/crm/deals/*`, doc upload/download, accounts/methods.
- [ ] UI: `/crm/deals` (list), `/crm/deals/new` (prefill from ?lead=), `/crm/deals/[id]` (detail + docs + edit).
- [ ] "Create deal from this lead" action on the lead detail (admin only).
- [ ] nav: CRM Deals (admin/super only via canSeeDeals).

## Slice C — Tests & verify
- [ ] E2E: admin creates a deal from a lead, uploads a doc; a BD is blocked from /crm/deals; accounts/methods managed.
- [ ] `npm run report` all-PASS; screenshots; KB (`modules/crm/leads-deals.md` + `database.md`) synced; review agents.

## Progress
- [x] Slice A — `0014` receiving_accounts + payment_methods (+seed) admin-only RLS + audit; routes
  (`/api/crm/receiving-accounts`, `/api/crm/payment-methods`); `/crm/deals/settings` (DealsSettings).
- [x] Slice B — `0014` deals + deal_documents (admin-only RLS); service `crm-deals.ts`; routes
  (`/api/crm/deals/*`, `deal-documents`); UI `/crm/deals` (list/new/[id]) + DealForm + DealDocuments;
  "Create deal from this lead" (admin) on the lead detail; nav Deals gated by `canSeeDeals`.
- [x] `seed-crm.mjs`: demo deal (DemoCorp) + receiving account.

## Gate
- [x] tsc · build clean · `npm run report` **ALL §14 PASS**.
- [x] E2E `tests/e2e/crm-deals.spec.ts` 2/2: admin deals list+detail+settings; **BD blocked from
  /crm/deals**. Screenshot read (salary Rs 750,000, accounts/method render).
- [x] review agents: security **GREEN**, quality 2 must-fix. Fixes (`0015` + code):
  - salary non-negative CHECK; `ON DELETE SET NULL` on working_developer/receiving_account_id/payment_method_id.
  - deal DELETE now removes its storage objects; `leadOptions` excludes disqualified/lost/cancelled;
    payment-methods empty state; `statusTone` active→success/ended→warning. DECISIONS.md #24/#25.
  - tsc+build clean; 6/6 CRM E2E re-pass.

**SHIPPED 2026-07-02.** Deals (admin-only) + accounts/methods live. Deferred: BD-commission-from-deals, invoicing.