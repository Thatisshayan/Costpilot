import { describe, expect, it } from "vitest";
import { budgetStatus, thresholdsIssue } from "../budget-math";

describe("budget status in exact cents", () => {
  it("counts refunds against spending and reports remaining, percent and threshold", () => {
    // 80.30 charges - 20.00 refund = 60.30 net against a 100.00 budget.
    const s = budgetStatus(10000n, 8030n - 2000n, [50, 80, 100]);
    expect(s).toEqual({ remainingCents: 3970n, percentUsed: 60.3, thresholdReached: 50, state: "alert" });
  });

  it("reaches a threshold exactly at the boundary, without floating point", () => {
    expect(budgetStatus(30000n, 24000n, [50, 80, 100]).thresholdReached).toBe(80); // exactly 80%
    expect(budgetStatus(30000n, 23999n, [50, 80, 100]).thresholdReached).toBe(50);
    expect(budgetStatus(10n, 1n, [10]).thresholdReached).toBe(10); // 0.01 of 0.10
  });

  it("is ok below every threshold, alert at 100% exactly, over only above the amount", () => {
    expect(budgetStatus(10000n, 4999n, [50, 80, 100]).state).toBe("ok");
    expect(budgetStatus(10000n, 10000n, [50, 80, 100])).toMatchObject({ state: "alert", thresholdReached: 100, remainingCents: 0n, percentUsed: 100 });
    expect(budgetStatus(10000n, 10001n, [50, 80, 100])).toMatchObject({ state: "over", remainingCents: -1n, percentUsed: 100 });
  });

  it("handles a net credit (more refunds than charges) as negative usage", () => {
    expect(budgetStatus(10000n, -2500n, [50])).toEqual({ remainingCents: 12500n, percentUsed: -25, thresholdReached: null, state: "ok" });
  });

  it("rounds the percentage half away from zero to 0.1", () => {
    expect(budgetStatus(30000n, 10000n, [100]).percentUsed).toBe(33.3);
    expect(budgetStatus(20000n, 10001n, [100]).percentUsed).toBe(50.0);
    expect(budgetStatus(2000n, 1001n, [100]).percentUsed).toBe(50.1); // 50.05 -> 50.1
    expect(budgetStatus(2000n, -1001n, [100]).percentUsed).toBe(-50.1);
  });

  it("rejects a non-positive amount", () => {
    expect(() => budgetStatus(0n, 0n, [50])).toThrow();
  });
});

describe("threshold validation", () => {
  it.each([[[50, 80, 100], null], [[100], null], [[1, 2, 3, 4, 5], null]])("accepts %j", (t, issue) => expect(thresholdsIssue(t)).toBe(issue));
  it.each([[[]], [[1, 2, 3, 4, 5, 6]], [[0]], [[101]], [[80, 50]], [[50, 50]], [[50.5]]])("rejects %j", t => expect(thresholdsIssue(t)).not.toBeNull());
});
