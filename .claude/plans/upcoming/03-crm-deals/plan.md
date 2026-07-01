# Plan 03 — CRM Deals (closure, documents, accounts)

**Status:** upcoming (awaiting owner approval — no code yet)
**Sources:** [FRD-04 Leads & Deals](../../../knowledgebase/frds/FRD-04-leads-deals.md) (the **deals** part) ·
access: [FRD-05](../../../knowledgebase/frds/FRD-05-roles-access.md)
**Depends on:** Plan 02 (leads exist). **Followed by:** Plan 04 (Activity Log).

> Closing a won lead into a **Deal** with engagement + financial details and documents. **Admin/
> super-admin only** (BD Leads: deal visibility scope per FRD-05 Q6). Requirements in FRD-04.

## What & why
Record landed engagements (designation, joining date, selected profile, working developer, salary, how
we get paid, profile DOB) + documents, replacing the Drive `Deals/<Company>/` folders. Sensitive/financial
→ strict access.

## Approach — slices
### Slice A — Accounts & payment methods (managed lists)
- **Migration** `00NN_crm_accounts.sql`: `receiving_accounts` (holder_name, bank_name, account_number,
  notes, active) — **admin/super-admin only** RLS (sensitive financial); `payment_methods` (name, active,
  sort_order) — **dynamically extendable** lookup, admin-managed. Audit + ENTITIES.
- **UI** admin settings screens to manage both lists.

### Slice B — Deals + documents
- **Migration** `00NN_crm_deals.sql`: `deals` (lead_id, designation, joining_date, dev_profile_id,
  working_developer (employee; may differ from profile), salary, receiving_account_id, payment_method_id,
  profile_dob, status) + `deal_documents` (private `crm-docs` bucket). **RLS: admin/super-admin only**
  (BD Leads per FRD-05 Q6 — deal financials scope). Audit + ENTITIES.
- **Close-a-lead flow** (manual, admin/super-admin, anytime): from a won lead → create the deal, prefill
  from the lead/profile; then edit engagement + financial fields; upload documents (signed-URL download,
  download-logged per FRD-06).
- **Service** `lib/services/deals.ts`; **UI** `app/(app)/crm/deals` (admin list + detail with documents),
  and a "close → deal" action on a lead.

### Slice C — Tests & verification
- RLS tests: **no BD** (and, per Q6, BD-Lead financial scope) can read `deals`/`deal_documents`/
  `receiving_accounts`; admin/super all.
- Integration: close lead → deal creation; account/method references; working-dev-differs-from-profile.
- Browser-verify: deal create from a won lead, documents upload/download, accounts/methods management,
  a BD confirmed unable to see deals.

## Key files
`supabase/migrations/` · `lib/services/deals.ts` · `app/(app)/crm/deals/*` + lead close action ·
crm-doc upload/download (from plan 01) · `app/(app)/admin/logs/page.tsx` (ENTITIES) · existing
super-admin-only RLS pattern (`0003_rls.sql`, `0007_private_pii.sql`).

## Rules / acceptance
Deals are the CRM's payroll-equivalent: **super-admin/admin only**, financial data, no leakage, no PII in
logs/screenshots. Acceptance = FRD-04 §10 (deal criteria).

## Gate
`tsc` clean · `build` green · `npm run report` all-PASS · browser screenshots · KB + `database.md` updated.

## Out of scope
BD-commission-from-deals, invoicing (FRD-04 §13 future). Rich Activity Log UI → Plan 04.
