import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { bdOptions, type Opt } from "@/lib/crm/options";
import { CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { CrmFilterBar } from "@/components/crm/filter-bar";
import { LeadCardActions } from "@/components/crm/lead-card-actions";
import { StatusPill } from "@/components/crm/status-pill";
import { parsePaging } from "@/lib/pagination";
import { labelize, statusTone, LEAD_STATUS, INTERVIEW_ROUND } from "@/lib/crm/constants";
import { formatCrmDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { page?: string; pageSize?: string; status?: string; owner?: string; profile?: string; q?: string };

const roundRank = (r: string | null) => (r ? INTERVIEW_ROUND.indexOf(r as any) : -1);
const initials = (name?: string | null) =>
  (name ?? "").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

function BdAvatar({ fullName }: { fullName?: string | null }) {
  return (
    <span
      title={fullName ?? undefined}
      aria-label={`BD: ${fullName ?? "unassigned"}`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-[11px] font-semibold text-brand-primary"
    >
      {initials(fullName) || "—"}
    </span>
  );
}

/** Leads tab — a card per company/opportunity, summarising its interviews + assessments (FRD-07). */
export async function LeadsCards({ searchParams, profiles }: { searchParams: SP; profiles: Opt[] }) {
  const supabase = createClient();
  const { page, pageSize, from, to } = parsePaging(searchParams);

  let query = supabase
    .from("leads")
    .select(
      `id, company, role, status, feedback, updated_at,
       profile:dev_profiles(name, stack:dev_stacks(name)),
       owner:profiles!leads_owner_bd_id_fkey(full_name),
       interviews(id, round, status, outcome, interview_at, received_date),
       assessments(id, status, entry_date, deadline)`,
      { count: "exact" }
    );
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.owner) query = query.eq("owner_bd_id", searchParams.owner);
  if (searchParams.profile) query = query.eq("dev_profile_id", searchParams.profile);
  if (searchParams.q) query = query.ilike("company", `%${searchParams.q}%`);
  const { data: rows, count } = await query.order("updated_at", { ascending: false }).range(from, to);

  const bds = await bdOptions(supabase);
  const list = (rows ?? []) as any[];

  return (
    <>
      <CrmFilterBar
        filters={[
          { key: "status", label: "Status", options: LEAD_STATUS.map((s) => ({ value: s, label: labelize(s) })) },
          { key: "owner", label: "Owner", options: bds.map((b) => ({ value: b.id, label: b.label })) },
          { key: "profile", label: "Profile", options: profiles.map((p) => ({ value: p.id, label: p.label })) },
        ]}
        search={{ key: "q", placeholder: "Search company" }}
      />

      {list.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-text-secondary">
          No leads match. Use <span className="font-medium">Add</span> to start a company thread.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((l) => {
          const interviews = [...(l.interviews ?? [])].sort((a, b) => roundRank(a.round) - roundRank(b.round));
          const assessments = l.assessments ?? [];
          return (
            <div key={l.id} className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/crm/leads/${l.id}`} className="block truncate text-h3 font-semibold text-text-primary hover:text-brand-primary">
                    {l.company}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-secondary">
                    {l.role && <span className="text-text-primary">{l.role}</span>}
                    <span>{l.profile?.name ?? "Unassigned profile"}</span>
                    {l.profile?.stack?.name && <Badge tone="neutral">{l.profile.stack.name}</Badge>}
                  </div>
                </div>
                <StatusPill status={l.status} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-4 text-caption">
                <div>
                  <div className="mb-1.5 font-medium text-text-secondary">Interviews ({interviews.length})</div>
                  {interviews.length === 0 && <div className="text-text-secondary">—</div>}
                  <div className="space-y-1.5">
                    {interviews.map((iv: any) => (
                      <div key={iv.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="rounded bg-surface px-1.5 py-0.5 font-medium text-text-primary">{iv.round ?? "—"}</span>
                        <Badge tone={statusTone(iv.outcome || iv.status)}>{labelize(iv.outcome || iv.status)}</Badge>
                        <span className="text-text-secondary">{formatCrmDate(iv.received_date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 font-medium text-text-secondary">Assessments ({assessments.length})</div>
                  {assessments.length === 0 && <div className="text-text-secondary">—</div>}
                  <div className="space-y-1.5">
                    {assessments.map((as: any) => (
                      <div key={as.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Badge tone={statusTone(as.status)}>{labelize(as.status)}</Badge>
                        <span className="text-text-secondary">{formatCrmDate(as.entry_date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {l.feedback && (
                <CardDescription className="mt-3 border-t border-border pt-2">{l.feedback}</CardDescription>
              )}

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                <LeadCardActions leadId={l.id} company={l.company} status={l.status} feedback={l.feedback} />
                <BdAvatar fullName={l.owner?.full_name} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
      </div>
    </>
  );
}
