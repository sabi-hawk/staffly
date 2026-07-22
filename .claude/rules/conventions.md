# Code Conventions — Softonoma Employee Portal

Next.js 14 (App Router, TS strict) + Supabase (Postgres + Auth + RLS) + Tailwind/shadcn-style UI.
Full architecture: `.claude/knowledgebase/reference/01-architecture-and-conventions.md`.

## Structure
- Business logic in `lib/services/**` (reused by routes, scripts, tests); pure math in `lib/{hours,payroll}.ts`. Keep routes/UI thin.
- Reads: server components hit Supabase directly (RLS enforces). Writes: a client component via the browser client (RLS-guarded) **or** a route handler in `app/api/**` (use a route when you need the service-role key, file IO, or shared logic + an explicit role check).
- DB `snake_case`; TS `camelCase`. Every table has `created_at`/`updated_at` (trigger-maintained).
- Times stored UTC, shown Asia/Karachi — use `lib/time.ts` + `lib/utils.ts` helpers (`companyToday`, `formatTime12`, `formatHours`, `formatPKR`, `avatarUrl`, `ageFromDob`). Money = PKR. Don't re-implement these.

## RSC boundary (we hit this bug twice — important)
**Never import a value/const/function from a `"use client"` module into a server component.** It
resolves to a client-reference proxy → silent `NaN`/0-row grids or `"x is not a function"`. Put
shared values/helpers in a plain `lib/*` module and import from there in both server and client.
(See `lib/pagination.ts`, `lib/worklog.ts`.) The `typecheck-changed` hook warns on this.

## Pagination
Server pages read `?page&pageSize`, use `.range()` + `count:'exact'`, render `components/ui/pagination.tsx`.
Constants in `lib/pagination.ts` (NOT the client component). Sizes 10/25/50/100/200/300.

## UI
Match the existing light theme + shadcn-style primitives in `components/ui/*`. Every large grid:
pagination + empty state. Mutations: toast feedback. Inner pages: a back link.

## Migrations & data
SQL in `supabase/migrations/NNNN_name.sql`, applied to the **cloud** DB via `npm run db:migrate`
(idempotent runner; uses `SUPABASE_DB_URL` session pooler). Update `.claude/database/database.md`
in the same change. Seed = `supabase/seed.sql` + `scripts/seed.mjs`.

## UI conventions (owner-mandated, 2026-07-07) — apply to ALL new and touched UI
- **Form fields = floating-label components** from `components/ui/field.tsx`: `FloatInput`,
  `FloatTextarea`, `FloatSelect`, or `FloatShell` around custom controls (DatePicker, FileInput,
  comboboxes). The label rests inside the control and floats onto the top border on focus/fill.
  Field explanations go on the `hint` prop (an InfoHint that rides the label). Do NOT write new
  `<Label>` + `<Input>` stacks.
- **Never use browser-native `confirm()` / `prompt()` / `alert()`** — use `ConfirmDialog` /
  `ReasonDialog` from `components/ui/dialog.tsx`.
- **Never use native `<input type="date|datetime-local">`** — use `DatePicker` / `DateTimePicker`
  from `components/ui/date-picker.tsx` (string values, drop-in).
- **Never use native `<input type="file">`** — use `FileInput` from `components/ui/file-input.tsx`.
- **Badges**: shared `Badge` (rounded-md, coloured border + translucent fill, auto-Capitalised).
  **Buttons** for approve/reject-style row actions: `variant="success" | "danger"` (soft coloured
  border + tint, not solid).
- **Dismiss (soft-hide a record) = `CircleX` icon + a confirm dialog** (owner-mandated 2026-07-22). A
  record dismiss (interviews, assessments, job-board posts, …) uses the circled-cross `CircleX` (NOT the
  reveal `EyeOff`, NOT the `Trash2` delete bin) and MUST confirm first via `ConfirmDialog`/`ReasonDialog`
  before applying — never dismiss on the first click. Restore uses `RotateCcw`/`Undo2`. (Exceptions:
  clearing a notification and toggling a payslip line are reversible high-frequency micro-actions — cross
  icon for consistency, no per-click modal.)
- **Selects** always `appearance-none` with our own chevron and a real gap from the right border
  (see `FloatSelect`).
- **No em dashes (—) in user-visible copy** — write plain sentences (owner: reads as AI-generated).
- Every field that needs explaining gets an InfoHint `hint` (2 words to 3 lines, say WHY it exists).

### Selects & filters (2026-07-08)
- Form selects → `FloatSelect` (floating label ALWAYS visible, since a select is never visually
  empty). Compact filter/utility selects (rows-per-page, toolbar filters, log filters) → `NativeSelect`
  from `components/ui/field.tsx` (custom chevron with a gap from the right border + refined colour;
  never the browser-default arrow touching the wall).
- CRM list filters (`components/crm/filter-bar.tsx`) use `FloatSelect` + `FloatInput` so they match
  the forms — one field standard across the platform. Do NOT hand-roll `selectCls` / native `<select>`
  in new UI.
