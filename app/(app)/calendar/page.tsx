import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ym(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = createClient();
  const base = searchParams.month ? new Date(`${searchParams.month}-01T00:00:00`) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth(); // 0-based
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = `${ym(base)}-01`;
  const monthEnd = `${ym(base)}-${String(daysInMonth).padStart(2, "0")}`;

  // audience-aware: only holidays that apply to the viewer (dept scope + deal-dev flag, 0041)
  const { data: { user } } = await supabase.auth.getUser();
  const { data: holidays } = await supabase
    .rpc("employee_holidays", { p_employee: user!.id, p_from: monthStart, p_to: monthEnd });
  const { data: leaves } = await supabase
    .from("leave_requests")
    .select("start_date, end_date, type, profiles!leave_requests_employee_id_fkey(full_name)")
    .eq("status", "approved").lte("start_date", monthEnd).gte("end_date", monthStart);

  // map day-number → { holidays:[], leaves:[{name,type}] }
  const cells: Record<number, { holidays: any[]; leaves: { name: string; type: string }[] }> = {};
  for (let d = 1; d <= daysInMonth; d++) cells[d] = { holidays: [], leaves: [] };
  for (const h of holidays ?? []) cells[new Date(h.holiday_date).getDate()]?.holidays.push(h);
  for (const l of leaves ?? []) {
    const s = new Date(l.start_date), e = new Date(l.end_date);
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month, d);
      if (day >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) && day <= new Date(e.getFullYear(), e.getMonth(), e.getDate()))
        cells[d].leaves.push({ name: (l as any).profiles?.full_name ?? "—", type: l.type });
    }
  }

  const lead = (first.getDay() + 6) % 7; // Monday-first blanks
  const prev = ym(new Date(year, month - 1, 1));
  const next = ym(new Date(year, month + 1, 1));
  const todayNum = new Date().getMonth() === month && new Date().getFullYear() === year ? new Date().getDate() : -1;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{first.toLocaleString("en-US", { month: "long", year: "numeric" })}</CardTitle>
        <div className="flex items-center gap-1">
          <Link href={`/calendar?month=${prev}`} className="rounded-md border border-border p-1.5 hover:bg-surface"><ChevronLeft className="size-4" /></Link>
          <Link href="/calendar" className="rounded-md border border-border px-2 py-1 text-caption hover:bg-surface">Today</Link>
          <Link href={`/calendar?month=${next}`} className="rounded-md border border-border p-1.5 hover:bg-surface"><ChevronRight className="size-4" /></Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border text-sm">
          {WD.map((w) => <div key={w} className="bg-surface px-2 py-1.5 text-caption font-medium text-text-secondary">{w}</div>)}
          {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} className="min-h-24 bg-card" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const c = cells[d];
            const weekend = ((lead + i) % 7) >= 5;
            return (
              <div key={d} className={cn("min-h-24 bg-card p-1.5", weekend && "bg-surface/60")}>
                <div className={cn("mb-1 text-caption tabular", d === todayNum ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-white" : "text-text-secondary")}>{d}</div>
                <div className="space-y-1">
                  {c.holidays.map((h) => <div key={h.id}><Badge tone="brand">{h.name}</Badge></div>)}
                  {c.leaves.slice(0, 3).map((l, idx) => (
                    <div key={idx} className="truncate text-[11px] text-text-secondary">🌴 {l.name}</div>
                  ))}
                  {c.leaves.length > 3 && <div className="text-[11px] text-text-secondary">+{c.leaves.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-caption text-text-secondary">Holidays in blue · 🌴 = on approved leave. Admins manage holidays in Settings.</p>
      </CardContent>
    </Card>
  );
}
