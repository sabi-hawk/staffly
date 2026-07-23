"use client";
// Copy an interview's full details (time, company, role, job-post URL, budget, profile name/email/stack,
// the assigned developer + email) to the clipboard for pasting into Slack. Fetches the formatted text
// from the server so it works anywhere (calendar popup, lead row) without the data on the client.
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Loader2 } from "lucide-react";
import { Tip } from "@/components/ui/tooltip";

export function CopyInterview({ interviewId, variant = "icon", className }: { interviewId: string; variant?: "icon" | "link"; className?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function copy() {
    setState("busy");
    try {
      const res = await fetch(`/api/crm/interviews/${interviewId}/share`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.text) throw new Error(j.error ?? "Could not load details");
      await navigator.clipboard.writeText(j.text);
      setState("done");
      toast.success("Interview details copied");
      setTimeout(() => setState("idle"), 1500);
    } catch (e) {
      setState("idle");
      toast.error((e as Error).message);
    }
  }

  const Icon = state === "busy" ? Loader2 : state === "done" ? Check : Copy;
  if (variant === "link") {
    return (
      <button onClick={copy} disabled={state === "busy"} className={className ?? "inline-flex items-center gap-1 text-caption font-medium text-brand-primary hover:underline"}>
        <Icon className={`size-3.5 ${state === "busy" ? "animate-spin" : ""}`} /> Copy details
      </button>
    );
  }
  return (
    <Tip label="Copy details">
      <button onClick={copy} disabled={state === "busy"} aria-label="Copy interview details" className={className ?? "inline-flex size-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface hover:text-brand-primary"}>
        <Icon className={`size-3.5 ${state === "busy" ? "animate-spin" : ""} ${state === "done" ? "text-emerald-600" : ""}`} />
      </button>
    </Tip>
  );
}
