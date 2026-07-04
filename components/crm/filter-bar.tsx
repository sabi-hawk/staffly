"use client";
import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export type FilterDef = { key: string; label: string; options: { value: string; label: string }[] };

// URL-driven filter bar for CRM list pages: selects + an optional text search. Writes searchParams
// (resetting ?page) so the server page can read them and filter the query. Uses a transition so the
// bar shows a pending state during the server round-trip.
export function CrmFilterBar({ filters, search }: { filters: FilterDef[]; search?: { key: string; placeholder?: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function nav(url: string) { startTransition(() => router.push(url)); }
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
    <div className={`mb-4 flex flex-wrap items-center gap-2 transition-opacity ${pending ? "opacity-60" : ""}`}>
      {filters.map((f) => (
        <select
          key={f.key}
          aria-label={f.label}
          value={params.get(f.key) ?? ""}
          onChange={(e) => setParam(f.key, e.target.value)}
          className="h-9 rounded-md border border-border bg-white px-3 text-sm"
        >
          <option value="">{f.label}: all</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
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
        <button onClick={clearAll} className="h-9 rounded-md border border-border px-3 text-sm text-text-secondary hover:bg-surface">
          Clear filters
        </button>
      )}
      {pending && <Loader2 className="size-4 animate-spin text-text-secondary" aria-label="Loading" />}
    </div>
  );
}
