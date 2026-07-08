"use client";
// BD daily job-application entry. Auto-lists each profile the BD owns with a count input; shows the
// live total (aggregate) plus the per-profile (segregated) numbers. This is the PRIMARY daily-work
// capture for a BD; the textual task summary stays for other work (resumes, cover letters, etc.).
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatInput } from "@/components/ui/field";
import type { ProfileCount } from "@/lib/services/bd-jobs";

export function BdJobCounts({
  profiles,
  workDate,
  editable = true,
}: {
  profiles: ProfileCount[];
  workDate: string;
  editable?: boolean;
}) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, string>>(
    () => Object.fromEntries(profiles.map((p) => [p.dev_profile_id, String(p.count || 0)]))
  );
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () => profiles.reduce((sum, p) => sum + (Math.max(0, Math.floor(Number(counts[p.dev_profile_id]) || 0))), 0),
    [counts, profiles]
  );
  const savedTotal = useMemo(() => profiles.reduce((s, p) => s + (p.count || 0), 0), [profiles]);
  const dirty = useMemo(
    () => profiles.some((p) => (Math.floor(Number(counts[p.dev_profile_id]) || 0)) !== (p.count || 0)),
    [counts, profiles]
  );

  async function save() {
    setBusy(true);
    const payload = profiles.map((p) => ({
      dev_profile_id: p.dev_profile_id,
      count: Math.max(0, Math.floor(Number(counts[p.dev_profile_id]) || 0)),
    }));
    const res = await fetch("/api/bd/job-counts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ work_date: workDate, counts: payload }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(j.error ?? "Could not save the counts");
    toast.success("Job applications saved");
    router.refresh();
  }

  if (profiles.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Briefcase className="size-4 text-brand-primary" /> Today&apos;s job applications</CardTitle>
        <p className="text-caption text-text-secondary">How many jobs you applied to today, per profile assigned to you.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {profiles.map((p) => (
            <FloatInput
              key={p.dev_profile_id}
              type="number"
              min={0}
              inputMode="numeric"
              label={p.label}
              value={counts[p.dev_profile_id] ?? "0"}
              disabled={!editable || busy}
              onChange={(e) => setCounts((c) => ({ ...c, [p.dev_profile_id]: e.target.value }))}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface/50 px-4 py-3">
          <div>
            <div className="text-caption text-text-secondary">Total applications today</div>
            <div className="text-h2 font-semibold text-text-primary tabular">{total}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => (
              <span key={p.dev_profile_id} className="rounded-md border border-border bg-white px-2.5 py-1 text-caption text-text-secondary">
                #{p.profile_no} <span className="font-medium text-text-primary tabular">{Math.max(0, Math.floor(Number(counts[p.dev_profile_id]) || 0))}</span>
              </span>
            ))}
          </div>
        </div>

        {editable && (
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={save} disabled={busy || !dirty}>{busy ? "Saving…" : "Save applications"}</Button>
            {!dirty && savedTotal > 0 && <span className="text-caption text-text-secondary">Saved.</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
