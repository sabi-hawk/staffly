"use client";
// Generic creatable single-select over plain string values: pick a preset from the list or type a new
// one ("Use …"). Value IS the string. Drop-in with the platform floating label via FloatShell.
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronsUpDown, Search, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatShell } from "@/components/ui/field";

export function CreatableCombo({
  options,
  value,
  onChange,
  id,
  label,
  hint,
  searchPlaceholder = "Search or type…",
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  id?: string;
  label: string;
  hint?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const query = q.trim();
  const filtered = options.filter((c) => c.toLowerCase().includes(query.toLowerCase()));
  const exact = options.some((c) => c.toLowerCase() === query.toLowerCase());

  function choose(v: string) { onChange(v); setOpen(false); setQ(""); }

  return (
    <FloatShell label={label} hint={hint} filled={!!value} htmlFor={id} className="min-h-10">
      <PopoverPrimitive.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
        <PopoverPrimitive.Trigger
          id={id}
          className={cn(
            "flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-white px-3 py-2 text-left text-sm transition-colors",
            "hover:border-brand-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          )}
        >
          <span className="min-w-0 flex-1 truncate text-text-primary">{value}</span>
          {value && <X className="size-3.5 shrink-0 text-text-secondary hover:text-danger" onClick={(e) => { e.stopPropagation(); onChange(""); }} />}
          <ChevronsUpDown className="size-4 shrink-0 text-text-secondary" />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content align="start" sideOffset={6} className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[16rem] overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="size-4 text-text-secondary" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="w-full bg-transparent text-sm focus:outline-none" />
            </div>
            <div className="max-h-56 overflow-auto p-1">
              {query && !exact && (
                <button type="button" onClick={() => choose(query)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-brand-primary hover:bg-surface">
                  <Plus className="size-4 shrink-0" /> Use &ldquo;{query}&rdquo;
                </button>
              )}
              {filtered.map((c) => (
                <button key={c} type="button" onClick={() => choose(c)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-primary hover:bg-surface">
                  <span className="truncate">{c}</span>
                </button>
              ))}
              {filtered.length === 0 && !query && <div className="px-2 py-3 text-caption text-text-secondary">Type to add.</div>}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </FloatShell>
  );
}
