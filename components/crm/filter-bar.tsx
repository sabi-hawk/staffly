"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type FilterDef = { key: string; label: string; options: { value: string; label: string }[] };

// URL-driven filter bar for CRM list pages: selects + an optional text search. Writes searchParams
// (resetting ?page) so the server page can read them and filter the query.
export function CrmFilterBar({ filters, search }: { filters: FilterDef[]; search?: { key: string; placeholder?: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(k: string, v: string) {
    const sp = new URLSearchParams(params.toString());
    if (v) sp.set(k, v);
    else sp.delete(k);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <select
          key={f.key}
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
          defaultValue={params.get(search.key) ?? ""}
          placeholder={search.placeholder ?? "Search…"}
          onKeyDown={(e) => { if (e.key === "Enter") setParam(search.key, (e.target as HTMLInputElement).value.trim()); }}
          onBlur={(e) => { const v = e.target.value.trim(); if (v !== (params.get(search.key) ?? "")) setParam(search.key, v); }}
          className="h-9 w-56 rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        />
      )}
    </div>
  );
}
