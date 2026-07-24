"use client";
// Cards ↔ Board (Kanban pipeline) toggle for the Leads tab. Writes ?view=board (cards is the default,
// so it clears the param).
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LeadsViewToggle({ view }: { view: "cards" | "board" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const go = (v: "cards" | "board") => {
    const p = new URLSearchParams(Array.from(sp.entries()));
    if (v === "cards") p.delete("view"); else p.set("view", v);
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  };
  const seg = "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-caption font-medium";
  const on = "bg-white text-brand-primary shadow-sm";
  const off = "text-text-secondary hover:text-text-primary";
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-surface/50 p-0.5">
      <button onClick={() => go("cards")} className={cn(seg, view === "cards" ? on : off)}><LayoutGrid className="size-3.5" /> Cards</button>
      <button onClick={() => go("board")} className={cn(seg, view === "board" ? on : off)}><Columns3 className="size-3.5" /> Board</button>
    </div>
  );
}
