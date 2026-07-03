// Route-level loading UI for the authenticated app (App Router shows this during RSC data fetches).
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-md bg-surface" />
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
