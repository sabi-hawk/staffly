"use client";
// Holidays management + list, hosted on the Announcements page (owner, 2026-07-06).
// A holiday can target the whole company or specific teams, and can exclude deal-assigned
// developers (their calendar is governed by the client company). Applicability drives both
// visibility AND working-day math (attendance, leave counts, payroll missing-day checks).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/crm/info-hint";

export type HolidayRow = {
  id: string; name: string; holiday_date: string; year: number;
  department_ids: string[] | null; include_deal_developers: boolean;
};
export type DeptOpt = { id: string; name: string };

function audienceLabel(h: HolidayRow, depts: DeptOpt[]): string {
  if (!h.department_ids || h.department_ids.length === 0) return "Everyone";
  const names = depts.filter((d) => h.department_ids!.includes(d.id)).map((d) => d.name);
  return names.join(", ") || "Specific teams";
}

export function HolidaysCard({
  holidays,
  departments,
  canManage,
  authorId,
}: {
  holidays: HolidayRow[];
  departments: DeptOpt[];
  canManage: boolean;
  authorId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [scope, setScope] = useState<"company" | "teams">("company");
  const [deptIds, setDeptIds] = useState<Set<string>>(new Set());
  const [includeDealDevs, setIncludeDealDevs] = useState(true);
  const [announce, setAnnounce] = useState(true);
  const [busy, setBusy] = useState(false);

  function setScopeAndDefaults(s: "company" | "teams") {
    setScope(s);
    // scoped holidays default to excluding deal-assigned devs (client governs their calendar)
    setIncludeDealDevs(s === "company");
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date) return toast.error("Name and date required");
    if (scope === "teams" && deptIds.size === 0) return toast.error("Pick at least one team (or choose Everyone)");
    setBusy(true);
    const supabase = createClient();
    const department_ids = scope === "company" ? null : Array.from(deptIds);
    const { error } = await supabase.from("holidays").insert({
      name: name.trim(),
      holiday_date: date,
      year: new Date(date).getFullYear(),
      department_ids,
      include_deal_developers: includeDealDevs,
    });
    if (error) { setBusy(false); return toast.error(error.message); }

    if (announce) {
      const who =
        scope === "company"
          ? includeDealDevs ? "the whole company" : "the whole company (except deal-assigned developers)"
          : `the ${departments.filter((d) => deptIds.has(d.id)).map((d) => d.name).join(", ")} team(s)${includeDealDevs ? "" : " — deal-assigned developers excluded"}`;
      const { error: annErr } = await supabase.from("announcements").insert({
        title: `Holiday: ${name.trim()} — ${date}`,
        body_text: `${name.trim()} on ${date} is a holiday for ${who}.`,
        author_id: authorId,
      });
      if (annErr) toast.error(`Holiday saved, but the announcement failed: ${annErr.message}`);
    }

    setBusy(false);
    toast.success(announce ? "Holiday added and announced" : "Holiday added");
    setName(""); setDate(""); setScopeAndDefaults("company"); setDeptIds(new Set()); setAnnounce(true);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this holiday? It becomes a working day again for its audience.")) return;
    const { error } = await createClient().from("holidays").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Holiday removed");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {holidays.length === 0 && <p className="py-2 text-caption text-text-secondary">No upcoming holidays.</p>}
      {holidays.map((h) => (
        <div key={h.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-brand-primary" />
            <span className="font-medium text-text-primary">{h.name}</span>
            <span className="text-caption tabular text-text-secondary">{h.holiday_date}</span>
            {canManage && (
              <>
                <Badge tone={h.department_ids ? "warning" : "neutral"}>{audienceLabel(h, departments)}</Badge>
                {!h.include_deal_developers && <Badge tone="brand">excl. deal-assigned devs</Badge>}
              </>
            )}
          </div>
          {canManage && (
            <button onClick={() => remove(h.id)} className="shrink-0 text-text-secondary hover:text-danger" aria-label={`Remove ${h.name}`}>
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      ))}

      {canManage && (
        <form onSubmit={add} className="space-y-3 border-t border-border pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hol-name">Holiday name</Label>
              <Input id="hol-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eid" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hol-date">Date</Label>
              <Input id="hol-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              Who is off?
              <InfoHint label="Who is off" text="Applicability is real, not cosmetic: for anyone outside the audience the date stays a normal working day — attendance, leave counting and payroll all follow it." />
            </Label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="hol-scope" checked={scope === "company"} onChange={() => setScopeAndDefaults("company")} /> Everyone
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="hol-scope" checked={scope === "teams"} onChange={() => setScopeAndDefaults("teams")} /> Specific teams
              </label>
            </div>
            {scope === "teams" && (
              <div className="flex flex-wrap gap-2 rounded-md border border-border p-2">
                {departments.map((d) => (
                  <label key={d.id} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-surface">
                    <input
                      type="checkbox"
                      checked={deptIds.has(d.id)}
                      onChange={(e) => setDeptIds((s) => { const n = new Set(s); if (e.target.checked) n.add(d.id); else n.delete(d.id); return n; })}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={includeDealDevs} onChange={(e) => setIncludeDealDevs(e.target.checked)} />
            <span className="flex items-center gap-1.5">
              Also applies to deal-assigned developers
              <InfoHint label="Deal-assigned developers" text="Their working calendar is governed by the client company. Untick and they won't see this holiday — the date stays a working day for them (attendance and payroll expect them to work)." />
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
            <span className="flex items-center gap-1.5">
              Post an announcement
              <InfoHint label="Post an announcement" text="Also publishes this holiday as an announcement (with who it applies to), which notifies everyone's bell." />
            </span>
          </label>

          <Button type="submit" disabled={busy}><Plus className="size-4" /> {busy ? "Adding…" : "Add holiday"}</Button>
        </form>
      )}
    </div>
  );
}
