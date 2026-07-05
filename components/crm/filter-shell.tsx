"use client";
// Shared filter transition + grid loading-overlay. The filter controls (CrmFilterBar / CrmDateFilter)
// read `nav`/`pending` from this context so the spinner shows OVER THE GRID being fetched — not on the
// filter bar itself (owner feedback). Render: <FilterShell toolbar={<filters/>}>{<Table/>}</FilterShell>.
import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Ctx = { nav: (url: string) => void; pending: boolean };
const FilterTransitionContext = createContext<Ctx | null>(null);

/** Filter controls use this: the shared shell transition when wrapped, else a local fallback. */
export function useFilterTransition(): Ctx {
  const ctx = useContext(FilterTransitionContext);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const local: Ctx = { nav: (url) => startTransition(() => router.push(url)), pending };
  return ctx ?? local;
}

export function FilterShell({ toolbar, children }: { toolbar: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const nav = (url: string) => startTransition(() => router.push(url));
  return (
    <FilterTransitionContext.Provider value={{ nav, pending }}>
      {toolbar}
      <div className="relative">
        {pending && (
          <div className="absolute inset-0 z-10 flex items-start justify-center rounded-lg bg-white/60 pt-16 backdrop-blur-[1px]">
            <Loader2 className="size-6 animate-spin text-brand-primary" aria-label="Loading" />
          </div>
        )}
        <div className={pending ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"}>
          {children}
        </div>
      </div>
    </FilterTransitionContext.Provider>
  );
}
