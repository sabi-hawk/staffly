import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm text-text-secondary [&_strong]:text-text-primary [&_li]:ml-4 [&_li]:list-disc">
        {children}
      </CardContent>
    </Card>
  );
}

export default function HandbookPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-h1 text-text-primary">Employee Handbook</h2>
        <p className="text-caption text-text-secondary">Softonoma company policies. This is a living document and may be updated.</p>
      </div>

      <Section title="Working hours & attendance">
        <ul>
          <li>Check in when you start and check out when you leave. You may check out and back in for <strong>breaks</strong> during the day. Your timer pauses on checkout and resumes on the next check-in.</li>
          <li>Your day's total is the <strong>sum of your worked sessions</strong> (breaks are not counted).</li>
          <li><strong>Deficit</strong> (short of your shift) and <strong>extra</strong> hours are tracked per day. Extra hours on one day never cancel a shortfall on another day (non-netting).</li>
          <li>Forgot to check out? An admin can correct your time, and you can edit your own checkout for the current day. Working late is fine: a checkout after midnight is recorded on the correct day.</li>
        </ul>
      </Section>

      <Section title="Daily task summary">
        <ul>
          <li>On each working day you check in, write a short <strong>task summary</strong> of what you worked on before you sign off.</li>
          <li>You can edit the summary the <strong>same day</strong>; once the day has passed it is locked. A summary added after the day is flagged as <strong>added late</strong> for admins.</li>
          <li>Admins can see who is still missing today&apos;s summary.</li>
        </ul>
      </Section>

      <Section title="Missing attendance">
        <ul>
          <li>A scheduled working day with <strong>no attendance and no approved leave</strong> is treated like unpaid leave and <strong>deducted</strong> from that month&apos;s pay.</li>
          <li>The payslip lists the exact missing dates. If a day was missed by mistake, an admin fixes the record (adds the attendance or a leave) and regenerates payroll to clear the deduction.</li>
        </ul>
      </Section>

      <Section title="Annual leave">
        <ul>
          <li><strong>8 days per year</strong>, accrued <strong>1 per month</strong>.</li>
          <li>Unused annual leave is <strong>carried forward within the calendar year</strong> and resets on <strong>1 January</strong>.</li>
          <li>Annual leave must be requested <strong>at least 21 days in advance</strong> (an admin can override in special cases).</li>
          <li>Requests are approved by HR/Admin. If you request more than your available balance, the extra days are filed as <strong>unpaid</strong>.</li>
        </ul>
      </Section>

      <Section title="Casual leave">
        <ul>
          <li><strong>1 day per month</strong>, submitted for admin approval like all leave. Only <strong>one casual request per month</strong>.</li>
          <li>Casual leave is <strong>use-it-or-lose-it</strong>: if you don't use it in a month, it does <strong>not</strong> carry over.</li>
        </ul>
      </Section>

      <Section title="Unpaid leave">
        <ul>
          <li>Available beyond your paid quota and recorded against you.</li>
          <li>Unpaid days are <strong>deducted</strong> from salary at <em>base salary ÷ working days in the period</em> per day.</li>
        </ul>
      </Section>

      <Section title="Probation">
        <ul>
          <li>Probation lasts <strong>3 months</strong> from your joining date.</li>
          <li>During probation there is <strong>no annual leave</strong> and only <strong>1 casual leave for the whole probation period</strong>. Any other leave is <strong>unpaid</strong>.</li>
          <li>After probation, annual-leave accrual begins and your contract is reviewed for permanent status.</li>
        </ul>
      </Section>

      <Section title="Developers assigned to a client deal">
        <ul>
          <li>Some engineering-department developers are <strong>assigned to a specific client deal</strong> and work as part of that company&apos;s team. Not every engineer is deal-assigned; some assist a lead developer internally and follow the company leave policy above.</li>
          <li>For a deal-assigned developer, <strong>leave is governed by the client company</strong> you work for, so our standard annual/casual balances do <strong>not</strong> apply to you and are not shown in your portal.</li>
          <li>When you take leave, <strong>first get it approved by the client company</strong> you&apos;re working with. Then log it here (dates + type + reason) purely so we have it on record; the request is confirmed by an admin.</li>
          <li>Annual leave in particular depends on the deal: if you&apos;re the only developer on a deal, time off has to be cleared with that company before it can be recorded.</li>
        </ul>
      </Section>

      <Section title="Payroll & payslips">
        <ul>
          <li>Salary = <strong>base salary + approved additions − deductions</strong> for the month.</li>
          <li>Additions (e.g. commissions, allowances, bonuses) are set per employee. BD commissions follow each person's agreed percentages.</li>
          <li>Payslips are generated monthly and can be printed or saved as PDF.</li>
        </ul>
      </Section>

      <Section title="Holidays & calendar">
        <ul>
          <li>Public/national/company holidays are published on the shared <strong>Calendar</strong> and excluded from working-day calculations.</li>
          <li>A holiday can apply to the <strong>whole company or specific teams</strong>. You only see the holidays that apply to you; for anyone outside a holiday&apos;s audience that day stays a normal working day.</li>
          <li>The calendar also shows who is on approved leave so the team can plan around it.</li>
        </ul>
      </Section>
    </div>
  );
}
