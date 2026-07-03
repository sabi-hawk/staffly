// Cron authorization — shared by app/api/cron/* route handlers. Server-only.
// Fail CLOSED: if CRON_SECRET is unset, no request is authorized (prevents the
// "Bearer undefined" bypass). Uses a constant-time compare to avoid token timing leaks.
// (Server-only by construction — imported solely by app/api/cron/* route handlers; not
// marked `import "server-only"` because that pkg isn't a dep and breaks the Vitest unit run.)
import { timingSafeEqual } from "crypto";

export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // unconfigured → never authorize (fail closed)

  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch — guard first (length isn't secret).
  return a.length === b.length && timingSafeEqual(a, b);
}
