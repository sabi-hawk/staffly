"use client";
// Searchable combobox (single or multi). Renders rich two-line options (label + sublabel) and an
// optional colour dot, filtered by a search box. Values are option ids; drop-in with the platform
// floating label via FloatShell. Used for the CRM profile picker (name · #num · stack / email) and
// multi-select working developers.
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatShell } from "@/components/ui/field";

export type ComboOption = { value: string; label: string; sublabel?: string; color?: string; mine?: boolean };

export function Combobox({
  options,
  value,
  onChange,
  multiple = false,
  id,
  label,
  hint,
  placeholder = "Not set",
  searchPlaceholder = "Search…",
}: {
  options: ComboOption[];
  value: string | string[];
  onChange: (v: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  multiple?: boolean;
  id?: string;
  label: string;
  hint?: string;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const selected: string[] = multiple ? ((value as string[]) ?? []) : value ? [value as string] : [];
  const byValue = React.useMemo(() => Object.fromEntries(options.map((o) => [o.value, o])), [options]);
  const filtered = options.filter((o) => `${o.label} ${o.sublabel ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  function toggle(v: string) {
    if (multiple) {
      const set = new Set(selected);
      if (set.has(v)) set.delete(v); else set.add(v);
      onChange(Array.from(set));
    } else {
      onChange(v === value ? "" : v);
      setOpen(false);
    }
  }

  const filled = selected.length > 0;
  // one chip renderer for both single and multi — a removable chip (multi) or a plain chip (single).
  const chip = (v: string, removable: boolean) => {
    const c = byValue[v]?.color || "#475569";
    return (
      <span key={v} className="inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-[3px] text-[11px] font-medium leading-none"
        style={{ color: c, borderColor: `${c}55`, backgroundColor: `${c}12` }}>
        <span className="truncate">{byValue[v]?.label ?? v}</span>
        {removable && <X className="size-3 shrink-0 cursor-pointer opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); toggle(v); }} />}
      </span>
    );
  };

  return (
    <FloatShell label={label} hint={hint} filled={filled} htmlFor={id} className="min-h-10">
      <PopoverPrimitive.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
        <PopoverPrimitive.Trigger
          id={id}
          className={cn(
            "flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-white px-3 py-2 text-left text-sm transition-colors",
            "hover:border-brand-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {selected.length === 0 && <span className="text-text-secondary/70">{placeholder}</span>}
            {selected.map((v) => chip(v, multiple))}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-text-secondary" />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content align="start" sideOffset={6} className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[18rem] overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="size-4 text-text-secondary" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="w-full bg-transparent text-sm focus:outline-none" />
            </div>
            <div className="max-h-64 overflow-auto p-1">
              {!multiple && (
                <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-secondary hover:bg-surface">
                  <span className="w-4" />{placeholder}
                </button>
              )}
              {filtered.map((o) => (
                <button key={o.value} type="button" onClick={() => toggle(o.value)} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface">
                  <span className="mt-0.5 w-4 shrink-0">{selected.includes(o.value) && <Check className="size-4 text-brand-primary" />}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                      {o.color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />}
                      <span className="truncate" style={o.color ? { color: o.color } : undefined}>{o.label}</span>
                      {o.mine && <span className="shrink-0 rounded bg-brand-primary/10 px-1 text-[10px] font-semibold text-brand-primary">You</span>}
                    </span>
                    {o.sublabel && <span className="block truncate text-caption text-text-secondary">{o.sublabel}</span>}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && <div className="px-2 py-3 text-caption text-text-secondary">No matches.</div>}
            </div>
            {multiple && selected.length > 0 && (
              <div className="border-t border-border px-3 py-1.5 text-right">
                <button type="button" onClick={() => onChange([])} className="text-caption text-text-secondary hover:text-danger">Clear all</button>
              </div>
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </FloatShell>
  );
}
