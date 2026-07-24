// Pipeline stage of a lead for the board (Kanban) view. A lead sits in the column of its CURRENT step
// = the STAGE of its most recent activity. There is ONE "Assessment" column and one column per round —
// a 2nd/3rd assessment just moves the card back to "Assessment" (the history lives on the card). No
// drag-drop: placement is derived from state.
import { INTERVIEW_ROUND, roundLabel } from "@/lib/crm/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Stage = { key: string; label: string };

const ivDate = (iv: any) => iv.interview_at || iv.received_date || null;
const asDate = (as: any) => as.entry_date || null;

export function leadStage(lead: any): Stage {
  const status = lead.status;
  if (status === "closed") return { key: "closed", label: "Closed" };
  if (status === "on_hold" || status === "rejected" || status === "dismissed") return { key: "parked", label: "Parked" };

  type Act = { kind: "interview" | "assessment"; round?: string | null; outcome?: string | null; date: string };
  const acts: Act[] = [];
  for (const iv of lead.interviews ?? []) {
    if (iv.dismissed_at) continue; // dismissed activities don't define the current step
    const d = ivDate(iv);
    if (d) acts.push({ kind: "interview", round: iv.round, outcome: iv.outcome, date: d });
  }
  for (const as of lead.assessments ?? []) {
    if (as.dismissed_at) continue;
    const d = asDate(as);
    if (d) acts.push({ kind: "assessment", date: d });
  }
  if (acts.length === 0) return { key: "new", label: "New" };

  acts.sort((a, b) => (a.date < b.date ? 1 : -1)); // most recent first
  const latest = acts[0];
  if (latest.kind === "interview") {
    if (latest.outcome === "selected") return { key: "selected", label: "Selected" };
    const r = latest.round || "1st";
    return { key: `round:${r}`, label: `${roundLabel(r)} round` };
  }
  return { key: "assessment", label: "Assessment" };
}

// The ordered columns to show for a set of leads: New · Assessment · 1st…up-to-the-furthest-round ·
// Selected · Closed · Parked. Trailing terminal columns (selected/closed/parked) only appear when a
// lead is actually there, so you don't see empty lanes.
export function boardColumns(leads: any[]): Stage[] {
  const present = new Set(leads.map((l) => leadStage(l).key));
  const cols: Stage[] = [
    { key: "new", label: "New" },
    { key: "assessment", label: "Assessment" },
  ];
  const roundIdxs = Array.from(present).filter((k) => k.startsWith("round:")).map((k) => INTERVIEW_ROUND.indexOf(k.slice(6) as any));
  const maxRoundIdx = roundIdxs.length ? Math.max(...roundIdxs) : -1;
  for (let i = 0; i <= maxRoundIdx; i++) cols.push({ key: `round:${INTERVIEW_ROUND[i]}`, label: `${roundLabel(INTERVIEW_ROUND[i])} round` });
  for (const t of [{ key: "selected", label: "Selected" }, { key: "closed", label: "Closed" }, { key: "parked", label: "Parked" }]) {
    if (present.has(t.key)) cols.push(t);
  }
  return cols;
}
