import { redirect } from "next/navigation";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { JobBoard } from "@/components/crm/job-board";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function JobBoardPage() {
  const me = await getCurrentProfile();
  if (!me || !hasPermP(me, PERM.crmAccess)) redirect("/dashboard");
  const supabase = createClient();

  const [{ data: rows }, { data: stacks }] = await Promise.all([
    supabase
      .from("job_hunts")
      .select("*, owner:profiles!job_hunts_owner_bd_id_fkey(full_name, color), stack:dev_stacks(name, color), dismisser:profiles!job_hunts_dismissed_by_fkey(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("dev_stacks").select("id, name, color").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job hunt board</CardTitle>
        <p className="text-caption text-text-secondary">A shared board of hunted job posts. Everyone sees everyone&apos;s rows live. Every field is optional — add a link or a company now, fill the rest later.</p>
      </CardHeader>
      <CardContent>
        <JobBoard rows={(rows ?? []) as any[]} stacks={(stacks ?? []) as any[]} meId={me.id} />
      </CardContent>
    </Card>
  );
}
