import { redirect } from "next/navigation";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Living product documentation for the owner (super-admin): what the product is, the roles & why they
// exist, and the business rules currently applied. Grows over time — keep it authentic (what's built
// today), not aspirational. Mirrors .claude/knowledgebase/reference/{00-product-overview,08-access}.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm text-text-secondary [&_strong]:text-text-primary [&_li]:ml-4 [&_li]:list-disc [&_h3]:mt-3 [&_h3]:font-semibold [&_h3]:text-text-primary">
        {children}
      </CardContent>
    </Card>
  );
}

export default async function ProductDocPage() {
  const profile = await getCurrentProfile();
  if (!profile || !hasPermP(profile, PERM.productDocView)) redirect("/admin/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-h1 text-text-primary">Product documentation</h2>
        <p className="text-caption text-text-secondary">
          Softonoma Employee Portal: what it is, the roles, and the business rules applied today. A living
          document (super-admin only). Updated as the product evolves.
        </p>
      </div>

      <Section title="What this is">
        <p>
          An internal <strong>HR / attendance / leave / payroll</strong> app for Softonoma, plus a <strong>CRM</strong>
          for the Business-Development team (candidate profiles, leads, interviews, assessments, and deals). Money is
          PKR; times are stored UTC and shown in Asia/Karachi.
        </p>
      </Section>

      <Section title="Roles & access">
        <p>Access is layered: middleware (route gating) + database RLS + UI. Roles:</p>
        <h3>Employee</h3>
        <ul>
          <li>Own dashboard, attendance (check-in/out, multi-session, daily task summary), leaves, calendar, handbook, profile.</li>
          <li>Sees only their own data (RLS-scoped). No CRM, no payroll, no other employees.</li>
        </ul>
        <h3>BD (Business Development)</h3>
        <ul>
          <li>Everything an employee has, <strong>plus CRM</strong>: their own dev-profiles, leads, interviews, assessments (owner-scoped).</li>
          <li>Cannot see deals, payroll, or other BDs&apos; data.</li>
        </ul>
        <h3>BD Lead</h3>
        <ul>
          <li>An elevated BD (`is_bd_lead`): sees & manages <strong>all</strong> BDs&apos; CRM data, like a senior reviewing juniors&apos; work.</li>
        </ul>
        <h3>Developer</h3>
        <ul>
          <li>An engineering employee flagged `is_developer`: assignable as the interview/assessment/deal developer.</li>
        </ul>
        <h3>Deal-assigned developer</h3>
        <ul>
          <li>A developer flagged `is_deal_developer` who works a <strong>client deal</strong> as part of that company&apos;s team.</li>
          <li>Their <strong>leave is governed by the client company</strong>, so we hide our annual/casual balances from them; leave requests are <strong>record-only</strong> (logged, confirmed by admin), bypassing our quotas/caps.</li>
          <li>Sees the <strong>name</strong> of the deal(s) they&apos;re on, never the financials.</li>
          <li>Not every engineer is deal-assigned; some just assist a lead developer and follow the normal company policy.</li>
        </ul>
        <h3>Admin / HR</h3>
        <ul>
          <li>Employee management, attendance oversight, leave approvals, reports, activity log, announcements.</li>
          <li><strong>Cannot see:</strong> payroll/salary/compensation, deal details/financials, login-event audit, CNIC/bank PII.</li>
        </ul>
        <h3>Super-admin (founders)</h3>
        <ul>
          <li>Full superset: payroll, company settings, <strong>deals (name, financials, assignments)</strong>, all audit, this product doc.</li>
        </ul>
      </Section>

      <Section title="Attendance & daily summary">
        <ul>
          <li><strong>Non-netting hours</strong>; a day&apos;s total = sum of worked sessions (breaks excluded), maintained by DB triggers.</li>
          <li>Multi-session days: check out / back in for breaks; the timer pauses and resumes.</li>
          <li><strong>Daily task summary</strong> (rich text) per work day: editable the same day; a past day with a summary is <strong>locked</strong>; a past day still missing can be added <strong>late</strong> (flagged, with the timestamp shown to admins).</li>
          <li>The attendance <strong>summary</strong> (worked days / leaves / missing / extra-deficit) is shown to employees only when the company setting is on (default on; admins always see it). The summary and the history grid share one date range.</li>
        </ul>
      </Section>

      <Section title="Leave">
        <ul>
          <li><strong>Annual:</strong> accrues 1/month up to 8/year, carried within the calendar year, resets 1 Jan; needs approval + 21-day notice (admin override).</li>
          <li><strong>Casual:</strong> 1 per month (no carry), auto-approved; only one casual request per month.</li>
          <li><strong>Unpaid:</strong> unlimited, recorded, deducted.</li>
          <li><strong>Probation</strong> (3 months): no annual; 1 casual for the whole probation; the rest unpaid.</li>
          <li><strong>Deal-assigned developers:</strong> our balances/caps don&apos;t apply; requests are recorded as pending for admin confirmation (client company governs their leave).</li>
        </ul>
      </Section>

      <Section title="CRM & deals">
        <ul>
          <li>CRM Leads is one hub keyed by company (Leads cards / Interviews / Assessments), with per-lead documents, job description, BD notes, and company contacts.</li>
          <li>Dev-profile documents (resumes/cover letters): the owning BD manages them; admins keep a recoverable history.</li>
          <li><strong>Deals are super-admin only</strong>: name, financials (salary, payment), documents, and developer assignments. Admin/HR can&apos;t see deal details; assigned developers see only the deal name.</li>
        </ul>
      </Section>

      <Section title="Roles & permissions (RBAC)">
        <ul>
          <li>Every capability is a <strong>permission</strong> (module.action). A role is a set of permissions; the role decides what a person sees and can do (nav, pages, data).</li>
          <li>Eight <strong>system roles</strong> ship with a written reason and can&apos;t be deleted. A super-admin can create <strong>custom roles</strong> from the same permission catalog and assign them on the employee&apos;s page.</li>
          <li>Two roles auto-set a profile <strong>flag</strong> on assignment: BD Lead sets <code>is_bd_lead</code>; Deal-assigned Developer sets <code>is_deal_developer</code>. Assigning a developer to a deal in CRM also sets <code>is_deal_developer</code> automatically.</li>
        </ul>
      </Section>

      <Section title="Configuration & holidays">
        <ul>
          <li>Leave quotas (annual/year, casual/month) drive the leave rules. <strong>Check-in buffer</strong> = grace before a check-in is marked late. <strong>Missed-checkout alert</strong> = hours past expected checkout before the system reminds the employee and alerts admins (a forgotten-checkout heads-up, never a warning held against anyone).</li>
          <li>Holidays are managed on the Announcements page and can target the <strong>whole company or specific teams</strong>, and can exclude deal-assigned developers. Applicability drives both visibility and working-day math (attendance, leave counting, payroll).</li>
        </ul>
      </Section>

      <Section title="Payroll">
        <ul>
          <li>Net = <strong>base salary + additions − deductions</strong>. Additions come from each employee&apos;s recurring compensation categories (e.g. fuel allowance) and BD commissions.</li>
          <li>Deductions include unpaid leave and <strong>missing days</strong> (a scheduled working day with no attendance and no approved leave), each priced at base ÷ working-days, with the exact dates shown on the payslip so HR can fix and regenerate.</li>
          <li>A run is a draft until <strong>finalised</strong>, then <strong>marked paid</strong> (with a paid date and receiving account). Payslips print or save as PDF.</li>
        </ul>
      </Section>

      <Section title="Notifications & activity log">
        <ul>
          <li>Everyone has a topbar <strong>bell</strong>: leave decisions and new announcements arrive there (and leave decisions also send an email). Admins get a second tab for operational <strong>alerts</strong> (pending approvals, forgotten checkouts, closed leads).</li>
          <li>The <strong>Activity Log</strong> records every change (who, when, what). It is scoped: super-admin sees all; admin/BD-Lead see non-financial entries; a BD sees their own CRM records. Financial and PII history stays super-admin only.</li>
        </ul>
      </Section>

      <Section title="Data privacy (defense in depth)">
        <ul>
          <li>Salary / payroll / compensation / payslips / login-events = <strong>super-admin only</strong>.</li>
          <li>Deal details/financials = <strong>super-admin only</strong>.</li>
          <li>CNIC / bank live in a separate private table (self or super-admin).</li>
          <li>Every rule is enforced in three layers: middleware, Supabase RLS, and the UI.</li>
        </ul>
      </Section>

      <Section title="Sessions & security">
        <ul>
          <li>Sessions are long-lived: the login token refreshes automatically on every navigation and while a tab is open, so an all-day user is never logged out. If a session ever can&apos;t refresh, the user is returned to login and resumes exactly where they were.</li>
          <li>Deactivated accounts are blocked at the middleware, RLS, and UI layers.</li>
        </ul>
      </Section>
    </div>
  );
}
