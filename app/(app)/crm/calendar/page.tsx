import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeCrm } from "@/lib/crm/access";
import { redirect } from "next/navigation";
import { karachiMidnightISO } from "@/lib/time";
import { bdColor } from "@/lib/crm/bd-color";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarEvent, type CalEvent } from "@/components/crm/calendar-event";

/* eslint-disable @typescript-eslint/no-explicit-any */
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const karachiDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

// Shared interview calendar: everyone with CRM access sees every booking (time + stack + BD colour);
// full details only for your OWN interviews (or admin/super). Powered by crm_calendar() (0034).
export default async function CrmCalendarPage({ searchParams }: { searchParams: { month?: string } }) {
  const me = await getCurrentProfile();
  if (!me || !canSeeCrm(me)) redirect("/dashboard");
  const supabase = createClient();

  const base = searchParams.month ? new Date(`${searchParams.month}-01T00:00:00`) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = `${ym(base)}-01`;
  const nextMonthStart = ym(new Date(year, month + 1, 1)) + "-01";

  const { data: events } = await supabase.rpc("crm_calendar", {
    p_from: karachiMidnightISO(monthStart),
    p_to: karachiMidnightISO(nextMonthStart),
  });
  const list = (events ?? []) as CalEvent[];

  // bucket by day-of-month in Asia/Karachi
  const cells: Record<number, CalEvent[]> = {};
  for (let d = 1; d <= daysInMonth; d++) cells[d] = [];
  for (const ev of list) {
    const kd = karachiDate(ev.interview_at); // YYYY-MM-DD
    if (kd.slice(0, 7) === ym(base)) cells[Number(kd.slice(8, 10))]?.push(ev);
  }

  // legend: distinct BDs present this month
  const bds = Array.from(new Map(list.map((e) => [e.owner_bd_id, e.owner_name])).entries());

  const lead = (first.getDay() + 6) % 7;
  const prev = ym(new Date(year, month - 1, 1));
  const next = ym(new Date(year, month + 1, 1));
  const now = new Date();
  const todayNum = now.getMonth() === month && now.getFullYear() === year ? now.getDate() : -1;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Interview calendar · {first.toLocaleString("en-US", { month: "long", year: "numeric" })}</CardTitle>
        <div className="flex items-center gap-1">
          <Link href={`/crm/calendar?month=${prev}`} className="rounded-md border border-border p-1.5 hover:bg-surface"><ChevronLeft className="size-4" /></Link>
          <Link href="/crm/calendar" className="rounded-md border border-border px-2 py-1 text-caption hover:bg-surface">Today</Link>
          <Link href={`/crm/calendar?month=${next}`} className="rounded-md border border-border p-1.5 hover:bg-surface"><ChevronRight className="size-4" /></Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border text-sm">
          {WD.map((w) => <div key={w} className="bg-surface px-2 py-1.5 text-caption font-medium text-text-secondary">{w}</div>)}
          {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} className="min-h-24 bg-card" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const evs = cells[d];
            const weekend = ((lead + i) % 7) >= 5;
            return (
              <div key={d} className={cn("min-h-24 bg-card p-1.5", weekend && "bg-surface/60")}>
                <div className={cn("mb-1 text-caption tabular", d === todayNum ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white" : "text-text-secondary")}>{d}</div>
                <div className="space-y-1">
                  {evs.slice(0, 4).map((ev) => <CalendarEvent key={ev.id} ev={ev} />)}
                  {evs.length > 4 && <div className="text-[11px] text-text-secondary">+{evs.length - 4} more</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-secondary">
          <span>Each chip = a scheduled interview (time · stack). Colour = the BD who owns it. Click your own for details.</span>
          {bds.map(([id, name]) => (
            <span key={id ?? "x"} className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: bdColor(id).dot }} />
              {name ?? "—"}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
