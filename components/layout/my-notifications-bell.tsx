"use client";
// Employee-facing notification bell (leave decisions, announcements — rows created by DB triggers,
// 0039). Unread badge; opening the dropdown lists the latest 15 and marks them read. RLS scopes rows
// to the caller. Direct browser client (self rows only).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Notif = { id: string; type: string; message: string; link: string | null; created_at: string; read_at: string | null };

export function MyNotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("employee_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    const list = (data ?? []) as Notif[];
    setItems(list);
    setUnread(list.filter((n) => !n.read_at).length);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 90_000);
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { clearInterval(t); document.removeEventListener("mousedown", close); };
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      const supabase = createClient();
      // RLS already scopes to self; the explicit eq is defence-in-depth if this ever runs elevated.
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (uid) {
        await supabase.from("employee_notifications").update({ read_at: new Date().toISOString() })
          .eq("employee_id", uid).is("read_at", null);
      }
      setUnread(0);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-md p-2 text-text-secondary hover:bg-surface" aria-label="Notifications">
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card p-2 shadow-soft">
          <p className="px-2 pb-1.5 pt-1 text-caption font-semibold text-text-primary">Notifications</p>
          <div className="max-h-80 overflow-y-auto">
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
        </div>
      )}
    </div>
  );
}
