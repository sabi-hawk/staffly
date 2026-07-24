import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPermP } from "@/lib/auth";
import { PERM } from "@/lib/access/permissions";
import { isSuperAdminRole } from "@/lib/crm/access";
import { bdOptions, type Opt } from "@/lib/crm/options";
import { CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { CrmFilterBar } from "@/components/crm/filter-bar";
import { CrmDateFilter } from "@/components/crm/crm-date-filter";
import { FilterShell } from "@/components/crm/filter-shell";
import { LeadCardActions } from "@/components/crm/lead-card-actions";
import { LeadsBoard } from "@/components/crm/leads-board";
import { LeadsViewToggle } from "@/components/crm/leads-view-toggle";
import { StatusPill } from "@/components/crm/status-pill";
import { CopyButton } from "@/components/crm/copy-button";
import { leadShareText } from "@/lib/crm/share-text";
import { parsePaging } from "@/lib/pagination";
import { labelize, roundLabel, statusTone, LEAD_STATUS, INTERVIEW_ROUND } from "@/lib/crm/constants";
import { formatCrmDate } from "@/lib/utils";
import { resolveRange, type RangeKey } from "@/lib/time";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { page?: string; pageSize?: string; status?: string; owner?: string; profile?: string; q?: string; range?: string; from?: string; to?: string; view?: string };

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
  // Board (Kanban) view shows the whole pipeline at once, so it loads a big page (no small pagination).
  const view: "cards" | "board" = searchParams.view === "board" ? "board" : "cards";
  const rangeFrom = view === "board" ? 0 : from;
  const rangeTo = view === "board" ? 499 : to;

  let query = supabase
    .from("leads")
    .select(
      `id, company, role, status, feedback, budget, expected_budget, shift, updated_at,
       profile:dev_profiles(name, stack:dev_stacks(name)),
       owner:profiles!leads_owner_bd_id_fkey(full_name),
       interviews(id, round, status, outcome, interview_at, received_date, dismissed_at),
       assessments(id, status, entry_date, deadline, dismissed_at)`,
      { count: "exact" }
    );
  // Default to IN PROGRESS (the active pipeline) so the list opens on live leads, not everything;
  // "all" is the explicit no-filter sentinel (mirrors the Owner filter).
  const statusParam = searchParams.status ?? "in_progress";
  if (statusParam !== "all") query = query.eq("status", statusParam);
  // Owner scoping: BD Lead defaults to their OWN leads (can switch to any BD or "all");
  // admins default to all. "all" is the explicit no-filter sentinel.
  const viewer = await getCurrentProfile();
  const isBdLeadRole = (viewer as any)?.app_role_key === "bd_lead";
  const ownerParam = searchParams.owner ?? (isBdLeadRole ? viewer!.id : undefined);
  if (ownerParam && ownerParam !== "all") query = query.eq("owner_bd_id", ownerParam);
  if (searchParams.profile) query = query.eq("dev_profile_id", searchParams.profile);
  if (searchParams.q) query = query.ilike("company", `%${searchParams.q}%`);
  // Last-activity date range (by updated_at) — default last 30 days, like interviews/assessments.
  const { from: rFrom, to: rTo, range } = resolveRange((searchParams.range as RangeKey) ?? "1m", searchParams.from, searchParams.to);
  query = query.gte("updated_at", `${rFrom}T00:00:00`).lte("updated_at", `${rTo}T23:59:59`);
  const { data: rows, count } = await query.order("updated_at", { ascending: false }).range(rangeFrom, rangeTo);

  const list = (rows ?? []) as any[];

  // BDs can't see CLOSED (won) leads (0038 — details are admin-only), but their track record stays:
  // show the count of their own closed deals. Admins see closed leads in the grid, so no chip.
  const me = viewer;
  // The Owner filter only makes sense when you can see more than your own leads (owner ask,
  // 2026-07-07): BD Lead + admin/super get it; a plain BD's grid is already scoped to self.
  const canFilterOwner = hasPermP(me, PERM.crmLeadsAll);
  const canDeleteLead = isSuperAdminRole(me?.role) || hasPermP(me, PERM.crmRecordsDelete);
  const bds = canFilterOwner ? await bdOptions(supabase) : [];
  let closedCount = 0;
  if (!hasPermP(me, PERM.crmLeadsClosed)) {
    const { data: cc } = await supabase.rpc("my_closed_deals_count");
    closedCount = (cc as number) ?? 0;
  }

  const toolbar = (
    <div className="mb-4 space-y-3 rounded-lg border border-border bg-surface/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
          Updated {formatCrmDate(rFrom)} → {formatCrmDate(rTo)} (inclusive)
          {closedCount > 0 && (
            <Badge tone="success">🏆 {closedCount} deal{closedCount === 1 ? "" : "s"} closed. Details with admin</Badge>
          )}
        </span>
        <div className="flex items-center gap-2">
          <LeadsViewToggle view={view} />
          <CrmDateFilter range={range} from={rFrom} to={rTo} />
        </div>
      </div>
      <div className="border-t border-border pt-3">
        <CrmFilterBar
          filters={[
            { key: "status", label: "Status", defaultValue: "in_progress", options: [{ value: "all", label: "All statuses" }, ...LEAD_STATUS.map((s) => ({ value: s, label: labelize(s) }))] },
            ...(canFilterOwner
              ? [{
                  key: "owner", label: "Owner",
                  options: [...(isBdLeadRole ? [{ value: "all", label: "All BDs" }] : []), ...bds.map((b) => ({ value: b.id, label: b.label }))],
                  ...(isBdLeadRole ? { defaultValue: viewer!.id } : {}),
                }]
              : []),
            { key: "profile", label: "Profile", options: profiles.map((p) => ({ value: p.id, label: p.label })) },
          ]}
          search={{ key: "q", placeholder: "Search company" }}
        />
      </div>
    </div>
  );

  return (
    <FilterShell toolbar={toolbar}>
      {view === "board" ? (
        <LeadsBoard leads={list} />
      ) : (
      <>
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
            <div key={l.id} className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-card">
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
                        <span className="rounded bg-surface px-1.5 py-0.5 font-medium text-text-primary">{iv.round ? roundLabel(iv.round) : "—"}</span>
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
                <LeadCardActions leadId={l.id} company={l.company} status={l.status} feedback={l.feedback} canDelete={canDeleteLead} />
                <div className="flex items-center gap-2">
                  <CopyButton text={leadShareText(l)} title="Copy lead details" />
                  <BdAvatar fullName={l.owner?.full_name} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <Pagination total={count ?? 0} page={page} pageSize={pageSize} />
      </div>
      </>
      )}
    </FilterShell>
  );
}
