"use client";
// Per-user "Connect Google Calendar" control (on the profile page). Connecting sends the BD through
// Google consent so the server can later create Calendar events with attachments on their behalf.
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, Loader2, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectGoogle({ connectedEmail }: { connectedEmail: string | null }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [busy, setBusy] = useState(false);

  // Toast the result of the OAuth round-trip (?google=connected|denied|error), then clean the URL.
  useEffect(() => {
    const g = sp.get("google");
    if (!g) return;
    if (g === "connected") toast.success("Google Calendar connected");
    else if (g === "denied") toast.error("Google connection cancelled");
    else toast.error("Could not connect Google. Please try again.");
    router.replace("/profile");
  }, [sp, router]);

  async function disconnect() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/google/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Could not disconnect");
      toast.success("Google Calendar disconnected");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (connectedEmail) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-text-primary">
          <CalendarCheck className="size-4 text-emerald-600" />
          Connected as <span className="font-medium">{connectedEmail}</span>
        </span>
        <div className="flex items-center gap-2">
          <a href="/api/auth/google/start" className="text-caption font-medium text-brand-primary hover:underline">Reconnect</a>
          <Button size="sm" variant="outline" onClick={disconnect} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Unplug className="size-3.5" />} Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-caption text-text-secondary">Connect your Google account to create interview events (with the developer as a guest and the lead&apos;s files attached) directly in your calendar.</span>
      <a href="/api/auth/google/start">
        <Button size="sm"><CalendarCheck className="size-4" /> Connect Google Calendar</Button>
      </a>
    </div>
  );
}
