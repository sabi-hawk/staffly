"use client";
// Back link that returns to wherever you came from (e.g. the Interviews tab), not always the Leads
// tab. Falls back to a given href on a fresh load with no history.
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackLink({ fallback = "/crm/leads", label = "Back" }: { fallback?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="inline-flex items-center gap-1 text-caption text-text-secondary hover:text-brand-primary"
    >
      <ChevronLeft className="size-4" /> {label}
    </button>
  );
}
