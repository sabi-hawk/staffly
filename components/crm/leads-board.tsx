// Kanban pipeline board for leads. Columns = stages (New · Assessment · 1st…furthest round · Selected ·
// Closed · Parked); each lead sits in the column of its CURRENT step (its most recent activity). Server
// component — cards are links, no client JS. Horizontal scroll for many columns.
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/crm/status-pill";
import { leadStage, boardColumns } from "@/lib/crm/lead-stage";
import { formatCrmDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function LeadsBoard({ leads }: { leads: any[] }) {
  if (leads.length === 0) {
    return <p className="rounded-lg border border-dashed border-border py-10 text-center text-text-secondary">No leads match. Widen the filters or switch to Cards.</p>;
  }
  const cols = boardColumns(leads);
  const byCol: Record<string, any[]> = {};
  for (const l of leads) (byCol[leadStage(l).key] ??= []).push(l);

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex gap-3">
        {cols.map((c) => {
          const items = byCol[c.key] ?? [];
          return (
            <div key={c.key} className="flex w-64 shrink-0 flex-col rounded-lg border border-border bg-surface/40">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-sm font-semibold text-text-primary">{c.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium tabular text-text-secondary">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {items.map((l) => <BoardCard key={l.id} lead={l} />)}
                {items.length === 0 && <p className="py-4 text-center text-[11px] text-text-secondary/60">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({ lead }: { lead: any }) {
  const ivCount = (lead.interviews ?? []).length;
  const asCount = (lead.assessments ?? []).length;
  return (
    <Link href={`/crm/leads/${lead.id}`} className="block rounded-md border border-border bg-white p-2.5 shadow-sm transition-colors hover:border-brand-primary/50">
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium text-text-primary">{lead.company}</span>
        <StatusPill status={lead.status} />
      </div>
      {lead.role && <div className="truncate text-caption text-text-secondary">{lead.role}</div>}
      {lead.profile?.name && (
        <div className="mt-1 flex items-center gap-1.5 text-caption text-text-secondary">
          <span className="truncate">{lead.profile.name}</span>
          {lead.profile?.stack?.name && <Badge tone="neutral">{lead.profile.stack.name}</Badge>}
        </div>
      )}
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-secondary">
        <span className="truncate">{lead.owner?.full_name ?? "—"}</span>
        <span className="shrink-0 tabular">{ivCount} iv · {asCount} as</span>
      </div>
      {lead.updated_at && <div className="mt-0.5 text-[10px] text-text-secondary/70">Updated {formatCrmDate(lead.updated_at)}</div>}
    </Link>
  );
}
