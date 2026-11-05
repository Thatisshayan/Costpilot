import { describe, expect, it } from "vitest";
import { comparisonPeriod, fromCents, monthPeriod, percentChange, shiftMonth, toCents } from "../spend-math";

describe("exact money in cents", () => {
  it.each([
    ["0", 0n], ["0.00", 0n], ["12.5", 1250n], ["12.50", 1250n], ["-4.5", -450n], ["-0.01", -1n],
    ["99999999.99", 9999999999n], ["123456789012.34", 12345678901234n],
  ])("toCents(%j)", (value, cents) => expect(toCents(value)).toBe(cents));

  it("treats null/empty as zero and rejects anything that is not a 2-decimal amount", () => {
    expect(toCents(null)).toBe(0n);
    expect(toCents("")).toBe(0n);
    for (const bad of ["1.234", "1e3", "abc", "1,00", "--1"]) expect(() => toCents(bad)).toThrow();
  });

  it("formats cents back to exact strings", () => {
    expect(fromCents(0n)).toBe("0.00");
    expect(fromCents(5n)).toBe("0.05");
    expect(fromCents(-450n)).toBe("-4.50");
    expect(fromCents(12345678901234n)).toBe("123456789012.34");
  });

  it("adds without floating-point drift", () => {
    // 0.1 + 0.2 in floating point is 0.30000000000000004
    expect(fromCents(toCents("0.10") + toCents("0.20"))).toBe("0.30");
    let sum = 0n;
    for (let i = 0; i < 1000; i++) sum += toCents("0.01");
    expect(fromCents(sum)).toBe("10.00");
  });
});

describe("percent change", () => {
  it("rounds half away from zero to one decimal", () => {
    expect(percentChange(11000n, 10000n)).toBe(10);
    expect(percentChange(10005n, 10000n)).toBe(0.1); // 0.05% rounds up
    expect(percentChange(9995n, 10000n)).toBe(-0.1);
    expect(percentChange(0n, 10000n)).toBe(-100);
    expect(percentChange(1n, 3n)).toBe(-66.7);
  });
  it("is null when the baseline is zero or a net credit", () => {
    expect(percentChange(5000n, 0n)).toBeNull();
    expect(percentChange(5000n, -100n)).toBeNull();
  });
});

describe("calendar periods", () => {
  it("treats the current month as partial up to today", () => {
    expect(monthPeriod("2026-11", "2026-11-05")).toEqual({ month: "2026-11", start: "2026-11-01", end: "2026-11-30", through: "2026-11-05", isPartial: true });
  });
  it("treats past months as complete, including leap Februaries", () => {
    expect(monthPeriod("2024-02", "2026-11-05")).toMatchObject({ end: "2024-02-29", through: "2024-02-29", isPartial: false });
    expect(monthPeriod("2025-02", "2026-11-05")).toMatchObject({ end: "2025-02-28", isPartial: false });
  });
  it("treats the last day of the month as complete", () => {
    expect(monthPeriod("2026-11", "2026-11-30").isPartial).toBe(false);
  });
  it("rejects future and malformed months", () => {
    expect(() => monthPeriod("2026-12", "2026-11-05")).toThrow(/future/);
    expect(() => monthPeriod("2026-13", "2026-11-05")).toThrow();
    expect(() => monthPeriod("26-11", "2026-11-05")).toThrow();
  });

  it("compares a partial month with the same days of the previous month", () => {
    expect(comparisonPeriod(monthPeriod("2026-11", "2026-11-05")))
      .toEqual({ month: "2026-10", start: "2026-10-01", through: "2026-10-05", basis: "same-days" });
  });
  it("clamps same-day comparisons to a shorter previous month", () => {
    expect(comparisonPeriod(monthPeriod("2026-03", "2026-03-31"))).toMatchObject({ basis: "full-month", through: "2026-02-28" });
    expect(comparisonPeriod(monthPeriod("2026-03", "2026-03-30"))).toMatchObject({ basis: "same-days", through: "2026-02-28" });
    expect(comparisonPeriod(monthPeriod("2024-03", "2024-03-30"))).toMatchObject({ basis: "same-days", through: "2024-02-29" });
  });
  it("compares a complete month with the complete previous month, across years", () => {
    expect(comparisonPeriod(monthPeriod("2026-01", "2026-11-05"))).toEqual({ month: "2025-12", start: "2025-12-01", through: "2025-12-31", basis: "full-month" });
  });
  it("shifts months across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", -5)).toBe("2026-06");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
  });
});
