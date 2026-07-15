"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/field";
import { useFilterTransition } from "@/components/crm/filter-shell";
import { PAGE_SIZES } from "@/lib/pagination";

export { PAGE_SIZES, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

/** URL-driven pagination + page-size selector. Reads/writes ?page & ?pageSize. */
export function Pagination({
  total,
  page,
  pageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  // Page/size changes refetch the server component. Route through the shared FilterShell transition so
  // the SAME loading overlay shows over the grid (was silent for a couple of seconds before). Falls back
  // to a local transition when not inside a FilterShell.
  const { nav, pending: isPending } = useFilterTransition();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function go(next: Partial<{ page: number; pageSize: number }>) {
    const sp = new URLSearchParams(params.toString());
    if (next.page != null) sp.set("page", String(next.page));
    if (next.pageSize != null) {
      sp.set("pageSize", String(next.pageSize));
      sp.set("page", "1");
    }
    nav(`${pathname}?${sp.toString()}`);
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 pt-3 text-caption text-text-secondary transition-opacity", isPending && "pointer-events-none opacity-60")}>
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <NativeSelect
          value={pageSize}
          onChange={(e) => go({ pageSize: Number(e.target.value) })}
          className="h-8"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </NativeSelect>
        <span className="flex items-center gap-1.5 tabular">
          {isPending && <Loader2 className="size-3.5 animate-spin text-brand-primary" />}
          {from}–{to} of {total}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => go({ page: page - 1 })}
          className="rounded-md border border-border p-1.5 disabled:opacity-40 hover:bg-surface"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pageRange(page, pages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2">…</span>
          ) : (
            <button
              key={p}
              onClick={() => go({ page: p as number })}
              className={cn(
                "min-w-8 rounded-md border px-2 py-1 text-sm tabular",
                p === page ? "border-brand-primary bg-brand-light text-brand-primary" : "border-border hover:bg-surface"
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          disabled={page >= pages}
          onClick={() => go({ page: page + 1 })}
          className="rounded-md border border-border p-1.5 disabled:opacity-40 hover:bg-surface"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
