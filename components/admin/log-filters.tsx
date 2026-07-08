"use client";
// Activity Log filter bar. Floating-label fields (Module / Action / Actor / From / To), a Clear
// button, and navigation through the shared FilterShell transition so ONLY the grid reloads (a
// spinner over it) instead of a full-page refresh.
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatSelect, FloatInput } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { useFilterTransition } from "@/components/crm/filter-shell";

type Opt = { value: string; label: string };

export function LogFilters({ entities, actions, initial }: {
  entities: Opt[];
  actions: Opt[];
  initial: { entity: string; action: string; actor: string; from: string; to: string };
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { nav } = useFilterTransition();
  const [entity, setEntity] = useState(initial.entity);
  const [action, setAction] = useState(initial.action);
  const [actor, setActor] = useState(initial.actor);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  // keep the fields in sync when the URL changes externally (back/forward, a shared link)
  useEffect(() => {
    setEntity(initial.entity); setAction(initial.action); setActor(initial.actor); setFrom(initial.from); setTo(initial.to);
  }, [initial.entity, initial.action, initial.actor, initial.from, initial.to]);

  const anyActive = !!(entity || action || actor || from || to);

  function apply() {
    const sp = new URLSearchParams(params.toString());
    const set = (k: string, v: string) => (v ? sp.set(k, v) : sp.delete(k));
    set("entity", entity); set("action", action); set("actor", actor.trim()); set("from", from); set("to", to);
    sp.delete("page");
    nav(`${pathname}?${sp.toString()}`);
  }
  function clear() {
    setEntity(""); setAction(""); setActor(""); setFrom(""); setTo("");
    const sp = new URLSearchParams(params.toString());
    ["entity", "action", "actor", "from", "to", "page", "lpage"].forEach((k) => sp.delete(k));
    const qs = sp.toString();
    nav(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <FloatSelect label="Module" value={entity} onChange={(e) => setEntity(e.target.value)} wrapClassName="w-44">
        <option value="">All modules</option>
        {entities.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </FloatSelect>
      <FloatSelect label="Action" value={action} onChange={(e) => setAction(e.target.value)} wrapClassName="w-40" className="capitalize">
        <option value="">All actions</option>
        {actions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </FloatSelect>
      <FloatInput label="Actor email" value={actor} onChange={(e) => setActor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") apply(); }} wrapClassName="w-56" />
      <DatePicker id="log-from" label="From" value={from} max={to || undefined} onChange={setFrom} className="w-40" />
      <DatePicker id="log-to" label="To" value={to} min={from || undefined} onChange={setTo} className="w-40" />
      <Button size="sm" onClick={apply}>Apply</Button>
      {anyActive && (
        <button onClick={clear} aria-label="Clear filters" title="Clear filters" className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-white text-text-secondary hover:bg-surface hover:text-text-primary">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
