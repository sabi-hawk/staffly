"use client";
// Admin topbar bell wired to crm_alerts (FRD-07): red unread badge + a popover of the last 30 days.
// Opening marks unread alerts read. Rendered only for admin/super (see Topbar).
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { formatCrmDatetime } from "@/lib/utils";

type Alert = { id: string; type: string; company: string | null; message: string; created_at: string; read_at: string | null };

export function AlertsBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/alerts");
      if (!res.ok) return;
      const { alerts, unread } = await res.json();
      if (!mounted.current) return; // don't set state after unmount (navigation mid-fetch)
      setAlerts(alerts ?? []);
      setUnread(unread ?? 0);
    } catch {
      /* silent — the bell is non-critical */
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // close the popover on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0); // optimistic
      await fetch("/api/crm/alerts", { method: "POST" }).catch(() => {});
      load();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="relative rounded-md p-2 text-text-secondary hover:bg-surface" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-soft" role="dialog" aria-label="Notifications">
          <div className="border-b border-border px-3 py-2 text-caption font-medium text-text-secondary">Alerts · last 30 days</div>
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 && <div className="px-3 py-6 text-center text-caption text-text-secondary">No alerts.</div>}
            {alerts.map((a) => (
              <div key={a.id} className={`border-b border-border px-3 py-2 last:border-0 ${a.read_at ? "" : "bg-brand-light/40"}`}>
                <div className="text-caption text-text-primary">{a.message}</div>
                <div className="mt-0.5 text-[11px] text-text-secondary">{formatCrmDatetime(a.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
