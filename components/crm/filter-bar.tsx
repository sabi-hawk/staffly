"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { FloatSelect, FloatInput } from "@/components/ui/field";
import { useFilterTransition } from "./filter-shell";

// defaultValue: shown when the param is absent (e.g. a BD Lead's Owner filter defaults to self);
// when set, the caller must provide its own "all" style option and the param is always written.
export type FilterDef = { key: string; label: string; options: { value: string; label: string }[]; defaultValue?: string };

// URL-driven filter bar for CRM list pages, using the platform floating-label fields so filters
// match the forms (owner ask, 2026-07-08). Navigation runs through the shared FilterShell
// transition, so the loading spinner shows over the grid.
export function CrmFilterBar({ filters, search }: { filters: FilterDef[]; search?: { key: string; placeholder?: string } }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { nav } = useFilterTransition();

  function setParam(k: string, v: string, always = false) {
    const sp = new URLSearchParams(params.toString());
    if (v || always) sp.set(k, v);
    else sp.delete(k);
    sp.delete("page");
    nav(`${pathname}?${sp.toString()}`);
  }

  const keys = [...filters.map((f) => f.key), ...(search ? [search.key] : [])];
  const anyActive = keys.some((k) => params.get(k));
  function clearAll() {
    const sp = new URLSearchParams(params.toString());
    for (const k of keys) sp.delete(k);
    sp.delete("page");
    const qs = sp.toString();
    nav(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {filters.map((f) => (
        <FloatSelect
          key={f.key}
          label={f.label}
          value={params.get(f.key) ?? f.defaultValue ?? ""}
          onChange={(e) => setParam(f.key, e.target.value, !!f.defaultValue)}
          wrapClassName="w-48"
        >
          {!f.defaultValue && <option value="">All</option>}
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </FloatSelect>
      ))}
      {search && (
        <FloatInput
          type="search"
          label={search.placeholder ?? "Search"}
          defaultValue={params.get(search.key) ?? ""}
          onKeyDown={(e) => { if (e.key === "Enter") setParam(search.key, (e.target as HTMLInputElement).value.trim()); }}
          onBlur={(e) => { const v = e.target.value.trim(); if (v !== (params.get(search.key) ?? "")) setParam(search.key, v); }}
          wrapClassName="w-64"
        />
      )}
      {anyActive && (
        <button
          onClick={clearAll}
          title="Clear filters"
          aria-label="Clear filters"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-white text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
