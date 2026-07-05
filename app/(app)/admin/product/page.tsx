import { redirect } from "next/navigation";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
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
  if (!profile || !isSuperAdmin(profile.role)) redirect("/admin/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-h1 text-text-primary">Product documentation</h2>
        <p className="text-caption text-text-secondary">
          Softonoma Employee Portal — what it is, the roles, and the business rules applied today. A living
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
        <p>Access is layered — middleware (route gating) + database RLS + UI. Roles:</p>
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
          <li>An elevated BD (`is_bd_lead`): sees & manages <strong>all</strong> BDs&apos; CRM data — a senior reviewing juniors&apos; work.</li>
        </ul>
        <h3>Developer</h3>
        <ul>
          <li>An engineering employee flagged `is_developer`: assignable as the interview/assessment/deal developer.</li>
        </ul>
        <h3>Deal-assigned developer</h3>
        <ul>
          <li>A developer flagged `is_deal_developer` who works a <strong>client deal</strong> as part of that company&apos;s team.</li>
          <li>Their <strong>leave is governed by the client company</strong>, so we hide our annual/casual balances from them; leave requests are <strong>record-only</strong> (logged, confirmed by admin), bypassing our quotas/caps.</li>
          <li>Sees the <strong>name</strong> of the deal(s) they&apos;re on — never the financials.</li>
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
          <li><strong>Deal-assigned developers:</strong> our balances/caps don&apos;t apply — requests are recorded as pending for admin confirmation (client company governs their leave).</li>
        </ul>
      </Section>

      <Section title="CRM & deals">
        <ul>
          <li>CRM Leads is one hub keyed by company (Leads cards / Interviews / Assessments), with per-lead documents, job description, BD notes, and company contacts.</li>
          <li>Dev-profile documents (resumes/cover letters): the owning BD manages them; admins keep a recoverable history.</li>
          <li><strong>Deals are super-admin only</strong> — name, financials (salary, payment), documents, and developer assignments. Admin/HR can&apos;t see deal details; assigned developers see only the deal name.</li>
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
    </div>
  );
}
