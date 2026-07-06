"use client";
// ⌘K command palette: jump to any page the caller's permissions grant (nav-derived), plus employee
// search for employees.view holders. Opens from the topbar search button or Cmd/Ctrl+K.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type PaletteItem = { label: string; href: string; group: string };

export function CommandPalette({ items, canSearchEmployees }: { items: PaletteItem[]; canSearchEmployees: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [people, setPeople] = useState<{ id: string; full_name: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("open-command-palette", onOpen); };
  }, []);

  useEffect(() => {
    if (!open) { setQ(""); setSel(0); return; }
    setTimeout(() => inputRef.current?.focus(), 30);
    if (canSearchEmployees && people.length === 0) {
      createClient().from("profiles").select("id, full_name").eq("status", "active").order("full_name")
        .then(({ data }) => setPeople((data ?? []) as any[]));
    }
  }, [open, canSearchEmployees, people.length]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const pages = items.filter((i) => !needle || i.label.toLowerCase().includes(needle));
    const emps = needle && canSearchEmployees
      ? people.filter((p) => p.full_name.toLowerCase().includes(needle)).slice(0, 6)
          .map((p) => ({ label: p.full_name, href: `/admin/employees/${p.id}`, group: "Employees" }))
      : [];
    return [...pages, ...emps].slice(0, 12);
  }, [q, items, people, canSearchEmployees]);

  function go(href: string) { setOpen(false); router.push(href); }

  useEffect(() => setSel(0), [q]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-text-secondary" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter" && results[sel]) go(results[sel].href);
            }}
            placeholder="Jump to a page or find an employee…"
            className="h-12 w-full bg-transparent text-sm focus:outline-none"
          />
          <kbd className="rounded bg-surface px-1.5 text-[10px] text-text-secondary">esc</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {results.length === 0 && <p className="px-2 py-6 text-center text-caption text-text-secondary">No matches.</p>}
          {results.map((r, i) => (
            <button
              key={`${r.href}-${r.label}`}
              onClick={() => go(r.href)}
              onMouseEnter={() => setSel(i)}
              className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm ${i === sel ? "bg-brand-light text-brand-primary" : "text-text-primary"}`}
            >
              <span className="flex items-center gap-2">
                {r.group === "Employees" && <User className="size-3.5 text-text-secondary" />}
                {r.label}
              </span>
              <span className="flex items-center gap-2 text-[11px] text-text-secondary">
                {r.group}
                {i === sel && <CornerDownLeft className="size-3" />}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
