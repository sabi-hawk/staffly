// Shared CRM cell renderers: a sleek colour chip (BD / stack / closer / working devs), a name in its
// colour, and a rich profile cell (name + #number + stack + email, tinted by the profile's colour).
// Colours come from profiles.color / dev_stacks.color / dev_profiles.color (0059/0061).
import Link from "next/link";

const FALLBACK = "#64748b";

/** A sleek pill chip tinted with `color` — the platform standard for BD / stack / person labels. */
export function ColorChip({ label, color }: { label?: string | null; color?: string | null }) {
  if (!label) return <span className="text-text-secondary">—</span>;
  const c = color || FALLBACK;
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full border px-2 py-[1px] text-[11px] font-medium leading-tight"
      style={{ color: c, borderColor: `${c}40`, backgroundColor: `${c}12` }}
    >
      {label}
    </span>
  );
}

/** A stack shown as a colour chip. */
export function StackBadge({ name, color }: { name?: string | null; color?: string | null }) {
  return <ColorChip label={name} color={color} />;
}

/** A person's name in their colour (falls back to default text colour). */
export function ColoredName({ name, color, className = "" }: { name?: string | null; color?: string | null; className?: string }) {
  if (!name) return <span className="text-text-secondary">—</span>;
  return <span className={className} style={color ? { color } : undefined}>{name}</span>;
}

type ProfileLike = {
  id: string;
  name: string;
  profile_no?: number | null;
  email?: string | null;
  color?: string | null;
  stack?: { name: string | null; color?: string | null } | null;
};

/** Rich profile cell: a colour dot + name (linked, tinted) + a caption line of #number · stack · email. */
export function ProfileCell({ p, href }: { p?: ProfileLike | null; href?: string }) {
  if (!p) return <span className="text-text-secondary">—</span>;
  const c = p.color || undefined;
  const nameEl = href
    ? <Link href={href} className="font-semibold hover:underline" style={c ? { color: c } : undefined}>{p.name}</Link>
    : <span className="font-semibold" style={c ? { color: c } : undefined}>{p.name}</span>;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {c && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c }} />}
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
