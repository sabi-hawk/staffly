"use client";
// Route-level error boundary for the authenticated app. Catches render/data errors in a segment
// and offers a retry, instead of crashing to a blank screen.
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface for observability; no PII — the message only.
    console.error("App segment error:", error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center">
      <h2 className="text-h2 text-text-primary">Something went wrong</h2>
      <p className="mt-2 text-caption text-text-secondary">
        This section failed to load. You can retry, or head back to your dashboard.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface"
        >
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
