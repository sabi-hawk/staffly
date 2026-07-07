"use client";
// Pagination for the Login activity grid — uses ?lpage so it doesn't clash with the audit log's ?page.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function LoginPager({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  function go(p: number) {
    const sp = new URLSearchParams(params.toString());
    if (p <= 1) sp.delete("lpage"); else sp.set("lpage", String(p));
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-end gap-1 pt-3 text-caption text-text-secondary">
      <span className="tabular">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
      <button onClick={() => go(page - 1)} disabled={page <= 1} className="ml-2 rounded-md border border-border p-1.5 disabled:opacity-40" aria-label="Previous"><ChevronLeft className="size-4" /></button>
      <span className="px-1 tabular">{page} / {pages}</span>
      <button onClick={() => go(page + 1)} disabled={page >= pages} className="rounded-md border border-border p-1.5 disabled:opacity-40" aria-label="Next"><ChevronRight className="size-4" /></button>
    </div>
  );
}
