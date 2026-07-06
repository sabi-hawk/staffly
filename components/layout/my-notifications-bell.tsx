"use client";
// The ONE topbar bell (owner, 2026-07-07: no duplicate bells). Everyone gets their own
// notifications (leave decisions, announcements; rows from the 0039 DB triggers). Holders of
// notifications.view get a second "Alerts" tab with the CRM alerts feed (last 30 days).
// The badge counts unread across both; opening a tab marks that tab read.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCrmDatetime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Notif = { id: string; type: string; message: string; link: string | null; created_at: string; read_at: string | null };
type Alert = { id: string; type: string; company: string | null; message: string; created_at: string; read_at: string | null };

export function MyNotificationsBell({ showAlerts = false }: { showAlerts?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"mine" | "alerts">("mine");
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsUnread, setAlertsUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("employee_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    if (!mounted.current) return;
    const list = (data ?? []) as Notif[];
    setItems(list);
    setUnread(list.filter((n) => !n.read_at).length);

    if (showAlerts) {
      try {
        const res = await fetch("/api/crm/alerts");
        if (res.ok) {
          const j = await res.json();
          if (!mounted.current) return;
          setAlerts(j.alerts ?? []);
          setAlertsUnread(j.unread ?? 0);
        }
      } catch { /* non-critical */ }
    }
  }, [showAlerts]);

  useEffect(() => {
    load();
    const t = setInterval(load, 90_000);
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => { clearInterval(t); document.removeEventListener("mousedown", close); document.removeEventListener("keydown", onKey); };
  }, [load]);

  async function markMineRead() {
    if (unread === 0) return;
    setUnread(0);
    const supabase = createClient();
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (uid) {
      await supabase.from("employee_notifications").update({ read_at: new Date().toISOString() })
        .eq("employee_id", uid).is("read_at", null);
    }
  }
  async function markAlertsRead() {
    if (alertsUnread === 0) return;
    setAlertsUnread(0);
    await fetch("/api/crm/alerts", { method: "POST" }).catch(() => {});
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      if (tab === "mine") void markMineRead();
      else void markAlertsRead();
    }
  }
  function switchTab(t: "mine" | "alerts") {
    setTab(t);
    if (t === "mine") void markMineRead();
    else void markAlertsRead();
  }

  const totalUnread = unread + alertsUnread;

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-md p-2 text-text-secondary hover:bg-surface" aria-label={`Notifications${totalUnread ? ` (${totalUnread} unread)` : ""}`}>
        <Bell className="size-4" />
        {totalUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-soft" role="dialog" aria-label="Notifications">
          {showAlerts ? (
            <div className="flex border-b border-border">
              {([["mine", `Notifications${unread ? ` (${unread})` : ""}`], ["alerts", `Alerts${alertsUnread ? ` (${alertsUnread})` : ""}`]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => switchTab(k)}
                  className={cn(
                    "flex-1 px-3 py-2 text-caption font-medium transition-colors",
                    tab === k ? "border-b-2 border-brand-primary text-brand-primary" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <p className="border-b border-border px-3 py-2 text-caption font-semibold text-text-primary">Notifications</p>
          )}

          {(!showAlerts || tab === "mine") && (
            <div className="max-h-80 overflow-y-auto p-1.5">
              {items.length === 0 && <p className="px-2 py-4 text-center text-caption text-text-secondary">Nothing yet.</p>}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setOpen(false); if (n.link) router.push(n.link); }}
                  className="block w-full rounded-md px-2 py-2 text-left hover:bg-surface"
                >
                  <span className="block text-sm text-text-primary">{n.message}</span>
                  <span className="block text-[11px] text-text-secondary">
                    {new Date(n.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              ))}
            </div>
          )}

          {showAlerts && tab === "alerts" && (
            <div className="max-h-80 overflow-y-auto">
              <div className="px-3 pt-2 text-[11px] text-text-secondary">Last 30 days</div>
              {alerts.length === 0 && <div className="px-3 py-5 text-center text-caption text-text-secondary">No alerts.</div>}
              {alerts.map((a) => (
                <div key={a.id} className={cn("border-b border-border px-3 py-2 last:border-0", !a.read_at && "bg-brand-light/40")}>
                  <div className="text-caption text-text-primary">{a.message}</div>
                  <div className="mt-0.5 text-[11px] text-text-secondary">{formatCrmDatetime(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
