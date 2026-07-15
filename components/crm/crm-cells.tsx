// Shared CRM cell renderers: a name in its assigned colour, a colour-tinted stack badge, and a rich
// profile cell (name + #number + stack + email). Colours come from profiles.color / dev_stacks.color
// (0059) so the same BD / stack reads at a glance everywhere they appear.
import Link from "next/link";

/** A person's name shown in their assigned colour (falls back to the default text colour). */
export function ColoredName({ name, color, className = "" }: { name?: string | null; color?: string | null; className?: string }) {
  if (!name) return <span className="text-text-secondary">—</span>;
  return <span className={className} style={color ? { color } : undefined}>{name}</span>;
}

/** A stack shown as a soft colour-tinted badge. */
export function StackBadge({ name, color }: { name?: string | null; color?: string | null }) {
  if (!name) return <span className="text-text-secondary">—</span>;
  const c = color || "#64748b";
  return (
    <span className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-caption font-medium" style={{ color: c, borderColor: `${c}55`, backgroundColor: `${c}14` }}>
      {name}
    </span>
  );
}

type ProfileLike = {
  id: string;
  name: string;
  profile_no?: number | null;
  email?: string | null;
  stack?: { name: string | null; color?: string | null } | null;
};

/** Rich profile cell: name (linked) + a caption line of #number · stack badge · email. */
export function ProfileCell({ p, href }: { p?: ProfileLike | null; href?: string }) {
  if (!p) return <span className="text-text-secondary">—</span>;
  const nameEl = href
    ? <Link href={href} className="font-medium text-text-primary hover:text-brand-primary">{p.name}</Link>
    : <span className="font-medium text-text-primary">{p.name}</span>;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {p.profile_no != null && <span className="font-mono text-caption text-text-secondary">#{p.profile_no}</span>}
        {nameEl}
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-text-secondary">
        {p.stack?.name && <StackBadge name={p.stack.name} color={p.stack.color} />}
        {p.email && <span className="truncate">{p.email}</span>}
      </div>
    </div>
  );
}
