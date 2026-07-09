// Small badge showing which database this app instance is connected to. Rendered ONLY locally
// (NEXT_PUBLIC_SHOW_ENV_BADGE is set by next.config when not on Vercel), so employees never see it on
// the real deployment, but while developing you always know whether you're on the DEV (dummy) DB or the
// live PROD DB. Driven by APP_ENV via the env resolver (scripts/lib/env.mjs).
export function EnvBadge() {
  if (process.env.NEXT_PUBLIC_SHOW_ENV_BADGE !== "1") return null;
  const prod = process.env.NEXT_PUBLIC_APP_ENV === "production";
  return (
    <span
      title={prod ? "Local app is connected to the PRODUCTION database" : "Local app is connected to the development (dummy) database"}
      className={
        "rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide " +
        (prod
          ? "border-danger/50 bg-danger/10 text-danger"
          : "border-success/50 bg-success/10 text-success")
      }
    >
      {prod ? "Prod DB" : "Dev DB"}
    </span>
  );
}
