// Slack-ready text for a day's work summary: per-profile job counts, jobs hunted, and (optionally) the
// notes. Shared by the read-only eye view and the BD's own "Today's summary" copy button.
const stripHtml = (s: string | null | undefined) =>
  (s ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();

export function summaryShareText({
  date,
  lines,
  hunted = 0,
  notes,
}: {
  date: string;
  lines: { label: string; count: number }[];
  hunted?: number;
  notes?: string | null;
}): string {
  const active = lines.filter((l) => (Number(l.count) || 0) > 0);
  const parts = [`Daily update — ${date}`];
  for (const l of active) parts.push(`${l.label} — ${l.count} job app${l.count === 1 ? "" : "s"}`);
  const total = active.reduce((s, l) => s + (Number(l.count) || 0), 0);
  if (active.length) parts.push(`Total: ${total} job app${total === 1 ? "" : "s"}`);
  // Jobs hunted always shows for a BD summary (any profiles present), even when 0.
  if (lines.length > 0 || hunted > 0) parts.push(`Jobs hunted: ${hunted}`);
  const n = stripHtml(notes);
  parts.push(`Notes: ${n || "—"}`);
  return parts.join("\n");
}
