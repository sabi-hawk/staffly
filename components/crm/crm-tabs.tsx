"use client";
// Tab bar for the CRM Leads hub (Leads / Interviews / Assessments). Switches the ?tab= param and
// resets grid paging/filters that don't apply across tabs.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "leads", label: "Leads" },
  { key: "interviews", label: "Interviews" },
  { key: "assessments", label: "Assessments" },
] as const;

export function CrmTabs({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function go(tab: string) {
    // keep the date range across tabs; drop tab-specific filters + paging.
    const sp = new URLSearchParams();
    for (const k of ["from", "to"]) {
      const v = params.get(k);
      if (v) sp.set(k, v);
    }
    sp.set("tab", tab);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="mb-4 flex gap-1 border-b border-border">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => go(t.key)}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            active === t.key
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
