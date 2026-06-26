import { describe, it, expect } from "vitest";
import {
  computeDayHours,
  summarisePeriod,
  shiftDurationHours,
  isLate,
  hoursBetween,
} from "@/lib/hours";

const date = "2026-06-01";
const at = (t: string) => `${date}T${t}:00+05:00`; // Asia/Karachi

describe("§14.2 hours — pure logic", () => {
  it("Normal day: in 10:00, out 19:00, exp 9 → total 9, deficit 0, extra 0", () => {
    const r = computeDayHours(at("10:00"), at("19:00"), 9);
    expect(r).toEqual({ total: 9, expected: 9, deficit: 0, extra: 0 });
  });

  it("Overtime: in 10:00, out 21:00, exp 9 → total 11, deficit 0, extra 2", () => {
    const r = computeDayHours(at("10:00"), at("21:00"), 9);
    expect(r).toMatchObject({ total: 11, deficit: 0, extra: 2 });
  });

  it("Deficit: in 10:00, out 17:30, exp 9 → total 7.5, deficit 1.5, extra 0", () => {
    const r = computeDayHours(at("10:00"), at("17:30"), 9);
    expect(r).toMatchObject({ total: 7.5, deficit: 1.5, extra: 0 });
  });

  it("NON-NETTING: Day A extra 2, Day B deficit 1.5 → summary extra 2, deficit 1.5 (not cancelled)", () => {
    const dayA = computeDayHours(at("10:00"), at("21:00"), 9); // extra 2
    const dayB = computeDayHours(at("10:00"), at("17:30"), 9); // deficit 1.5
    const sum = summarisePeriod([dayA, dayB]);
    expect(sum.totalExtra).toBe(2);
    expect(sum.totalDeficit).toBe(1.5);
    // gross — a surplus day must NOT reduce the deficit
    expect(sum.totalDeficit).not.toBe(0);
  });

  it("shiftDurationHours 10:00–19:00 = 9", () => {
    expect(shiftDurationHours("10:00", "19:00")).toBe(9);
  });

  it("hoursBetween rounds to 2dp (8h50m = 8.83)", () => {
    expect(hoursBetween(at("10:00"), at("18:50"))).toBe(8.83);
  });

  it("isLate respects buffer (10:00 start + 90m grace)", () => {
    expect(isLate(at("11:00"), "10:00", 90, date)).toBe(false); // within grace
    expect(isLate(at("11:31"), "10:00", 90, date)).toBe(true); // past grace
  });
});
