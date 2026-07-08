import { describe, it, expect, afterEach } from "vitest";
import { dangerConfigured, verifyDangerPassword } from "@/lib/danger-core";

describe("§14.2 danger-password — configured flag + constant-time verify", () => {
  const original = process.env.DANGER_PASSWORD;
  afterEach(() => {
    if (original === undefined) delete process.env.DANGER_PASSWORD;
    else process.env.DANGER_PASSWORD = original;
  });

  it("is inactive (and verify fails closed) when DANGER_PASSWORD is unset", () => {
    delete process.env.DANGER_PASSWORD;
    expect(dangerConfigured()).toBe(false);
    expect(verifyDangerPassword("anything")).toBe(false);
    expect(verifyDangerPassword("")).toBe(false);
    expect(verifyDangerPassword(null)).toBe(false);
  });

  it("is active and accepts the exact password when set", () => {
    process.env.DANGER_PASSWORD = "Str0ng-Danger-Pass";
    expect(dangerConfigured()).toBe(true);
    expect(verifyDangerPassword("Str0ng-Danger-Pass")).toBe(true);
  });

  it("rejects a wrong, prefix, or empty password (length differs → no throw, false)", () => {
    process.env.DANGER_PASSWORD = "Str0ng-Danger-Pass";
    expect(verifyDangerPassword("wrong")).toBe(false);
    expect(verifyDangerPassword("Str0ng-Danger")).toBe(false);
    expect(verifyDangerPassword("")).toBe(false);
    expect(verifyDangerPassword(null)).toBe(false);
  });
});
