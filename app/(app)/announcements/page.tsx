import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { AnnouncementActions } from "@/components/admin/announcement-actions";
import { Pagination } from "@/components/ui/pagination";
import { parsePaging } from "@/lib/pagination";
import { Megaphone } from "lucide-react";

export default async function AnnouncementsPage({ searchParams }: { searchParams: { page?: string; pageSize?: string } }) {
  const profile = (await getCurrentProfile())!;
  const canManage = hasPermP(profile, PERM.announcementsManage);
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);
  const { data: items, count } = await supabase
    .from("announcements")
    .select("*, profiles!announcements_author_id_fkey(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Post an announcement</CardTitle>
            <CardDescription>Visible to everyone in the company.</CardDescription>
          </CardHeader>
          <CardContent><AnnouncementForm authorId={profile.id} /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(items ?? []).length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-text-secondary">
              <Megaphone className="size-6" /><p className="text-caption">No announcements yet.</p>
            </div>
          )}
          {(items ?? []).map((a: any) => (
            <div key={a.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-h3 text-text-primary">{a.title}</h3>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-text-secondary tabular">
                    {new Date(a.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  {canManage && <AnnouncementActions id={a.id} title={a.title} body={a.body_text} />}
                </span>
              </div>
              {a.body_text && <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{a.body_text}</p>}
              <p className="mt-2 text-[11px] text-text-secondary">— {a.profiles?.full_name ?? "Admin"}</p>
            </div>
          ))}
          <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
        </CardContent>
      </Card>
    </div>
  );
}
