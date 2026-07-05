"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useFilterTransition } from "./filter-shell";

export type FilterDef = { key: string; label: string; options: { value: string; label: string }[] };

// URL-driven filter bar for CRM list pages: labelled selects + an optional text search. Each select
// keeps its filter NAME visible ("Outcome" ▸ value) so a chosen value is never ambiguous. Navigation
// runs through the shared FilterShell transition, so the loading spinner shows over the grid.
export function CrmFilterBar({ filters, search }: { filters: FilterDef[]; search?: { key: string; placeholder?: string } }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { nav } = useFilterTransition();

  function setParam(k: string, v: string) {
    const sp = new URLSearchParams(params.toString());
    if (v) sp.set(k, v);
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
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => {
        const active = !!params.get(f.key);
        return (
          <label
            key={f.key}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md border bg-white pl-2.5 pr-1 text-sm ${active ? "border-brand-primary/60" : "border-border"}`}
          >
            <span className="text-caption font-medium text-text-secondary">{f.label}</span>
            <select
              aria-label={f.label}
              value={params.get(f.key) ?? ""}
              onChange={(e) => setParam(f.key, e.target.value)}
              className="h-full cursor-pointer border-0 bg-transparent pr-1 text-sm font-medium text-text-primary focus:outline-none"
            >
              <option value="">All</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        );
      })}
      {search && (
        <input
          type="search"
          aria-label={search.placeholder ?? "Search"}
          defaultValue={params.get(search.key) ?? ""}
          placeholder={search.placeholder ?? "Search…"}
          onKeyDown={(e) => { if (e.key === "Enter") setParam(search.key, (e.target as HTMLInputElement).value.trim()); }}
          onBlur={(e) => { const v = e.target.value.trim(); if (v !== (params.get(search.key) ?? "")) setParam(search.key, v); }}
          className="h-9 w-56 rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        />
      )}
      {anyActive && (
        <button
          onClick={clearAll}
          title="Clear filters"
          aria-label="Clear filters"
          className="inline-flex size-8 items-center justify-center rounded-full bg-surface text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
