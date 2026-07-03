import { describe, it, expect, afterEach } from "vitest";
import { isAuthorizedCron } from "@/lib/cron-auth";

const req = (auth?: string) =>
  new Request("http://x/api/cron/x", auth ? { headers: { authorization: auth } } : undefined);

describe("§14.2 cron-auth — fail-closed, constant-time bearer check", () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("rejects everything when CRON_SECRET is unset (no 'Bearer undefined' bypass)", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCron(req("Bearer undefined"))).toBe(false);
    expect(isAuthorizedCron(req("Bearer "))).toBe(false);
    expect(isAuthorizedCron(req())).toBe(false);
  });

  it("accepts the exact matching bearer token", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    expect(isAuthorizedCron(req("Bearer s3cr3t-value"))).toBe(true);
  });

  it("rejects a wrong, prefix, or missing token", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    expect(isAuthorizedCron(req("Bearer wrong"))).toBe(false);
    expect(isAuthorizedCron(req("Bearer s3cr3t"))).toBe(false); // length differs → no throw, false
    expect(isAuthorizedCron(req("s3cr3t-value"))).toBe(false); // missing 'Bearer ' prefix
    expect(isAuthorizedCron(req())).toBe(false);
  });
});
