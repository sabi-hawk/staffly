"use client";
// Copy pre-formatted details to the clipboard (for sharing a lead/interview/assessment in Slack etc.).
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text, className, title = "Copy details" }: { text: string; className?: string; title?: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <button
      onClick={copy}
      title={title}
      aria-label={title}
      className={className ?? "inline-flex size-7 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface"}
    >
      {done ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}
