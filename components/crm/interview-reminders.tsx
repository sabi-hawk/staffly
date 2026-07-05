"use client";
// Reminds the owning BD ~30 min before their own interviews, while the tab is open. Polls every 60s
// (own interviews only — RLS-scoped + owner filter), fires a toast + a soft beep once per interview.
// Sound is best-effort: browsers block autoplay until the first user gesture, so we arm the audio then.
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const KEY = "iv-reminded"; // localStorage: ids already reminded (so a refresh doesn't re-fire)

export function InterviewReminders({ enabled, employeeId }: { enabled: boolean; employeeId: string }) {
  const reminded = useRef<Set<string>>(new Set());
  const armed = useRef(false);
  const ac = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const arm = () => {
      armed.current = true;
      try { ac.current = ac.current ?? new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* no audio */ }
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);

    try { reminded.current = new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { /* ignore */ }

    function beep() {
      if (!armed.current || !ac.current) return;
      try {
        const c = ac.current, o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination); o.type = "sine"; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.07, c.currentTime + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
        o.start(); o.stop(c.currentTime + 0.55);
      } catch { /* ignore */ }
    }

    const supabase = createClient();
    async function check() {
      const now = new Date();
      const soon = new Date(now.getTime() + 30 * 60000);
      const { data } = await supabase
        .from("interviews")
        .select("id, company, interview_at, dev_profiles(stack:dev_stacks(name))")
        .eq("owner_bd_id", employeeId)
        .neq("status", "cancelled")
        .gte("interview_at", now.toISOString())
        .lte("interview_at", soon.toISOString());
      let changed = false;
      for (const iv of (data ?? []) as any[]) {
        if (reminded.current.has(iv.id)) continue;
        reminded.current.add(iv.id); changed = true;
        const mins = Math.max(1, Math.round((new Date(iv.interview_at).getTime() - Date.now()) / 60000));
        const stack = iv.dev_profiles?.stack?.name;
        toast.warning(`Interview in ~${mins} min${iv.company ? ` · ${iv.company}` : ""}${stack ? ` (${stack})` : ""}`, { duration: 15000 });
        beep();
      }
      if (changed) { try { localStorage.setItem(KEY, JSON.stringify(Array.from(reminded.current))); } catch { /* ignore */ } }
    }

    check();
    const t = setInterval(check, 60000);
    return () => {
      clearInterval(t);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [enabled, employeeId]);

  return null;
}
