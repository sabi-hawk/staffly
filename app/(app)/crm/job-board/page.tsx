import { redirect } from "next/navigation";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { createClient } from "@/lib/supabase/server";
import { bdOptions } from "@/lib/crm/options";
import { companyToday } from "@/lib/time";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { JobBoard } from "@/components/crm/job-board";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function JobBoardPage({ searchParams }: { searchParams: { date?: string; page?: string; pageSize?: string } }) {
  const me = await getCurrentProfile();
  if (!me || !hasPermP(me, PERM.crmAccess)) redirect("/dashboard");
  const supabase = createClient();

  // Default to TODAY (BDs mostly extract today's links) — the day is a URL filter they can change.
  const day = searchParams.date || companyToday();
  const pageSize = Math.min(2000, Math.max(50, Number(searchParams.pageSize) || 200)); // default 200
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * pageSize;
  // Karachi day → UTC range on created_at (timestamptz).
  const start = `${day}T00:00:00+05:00`;
  const end = `${day}T23:59:59.999+05:00`;

  const [{ data: rows, count }, bds, { data: stacks }] = await Promise.all([
    supabase
      .from("job_hunts")
      .select("*, owner:profiles!job_hunts_owner_bd_id_fkey(full_name, color), stack:dev_stacks(name, color), dismisser:profiles!job_hunts_dismissed_by_fkey(full_name)", { count: "exact" })
      .gte("created_at", start).lte("created_at", end)
      // Stable order: created_at DESC puts the newest on top, and id DESC is a deterministic tiebreak so
      // rows with the SAME created_at (a bulk paste inserts them in one transaction → identical now())
      // never reshuffle — editing a row can't push it to the end.
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1),
    bdOptions(supabase),
    supabase.from("dev_stacks").select("id, name, color").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job hunt board</CardTitle>
        <p className="text-caption text-text-secondary">A shared board of hunted job posts. Everyone sees everyone&apos;s rows live. Every field is optional, so add a link or a company now and fill the rest later.</p>
      </CardHeader>
      <CardContent>
        <JobBoard
          rows={(rows ?? []) as any[]}
          total={count ?? 0}
          page={page}
          pageSize={pageSize}
          day={day}
          bds={bds}
          stacks={(stacks ?? []) as any[]}
          meId={me.id}
        />
      </CardContent>
    </Card>
  );
}
