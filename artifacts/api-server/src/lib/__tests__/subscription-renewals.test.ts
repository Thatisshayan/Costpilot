import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({ db: {}, expensesTable: {}, subscriptionsTable: {} }));

import { dueRenewals, monthlyEquivalentCents, nextRenewal } from "../subscription-renewals";

describe("next renewal", () => {
  it("adds a week, a month, a quarter or a year", () => {
    expect(nextRenewal("2026-11-17", "weekly")).toBe("2026-11-24");
    expect(nextRenewal("2026-12-29", "weekly")).toBe("2027-01-05");
    expect(nextRenewal("2026-11-17", "monthly")).toBe("2026-12-17");
    expect(nextRenewal("2026-12-17", "monthly")).toBe("2027-01-17");
    expect(nextRenewal("2026-11-30", "quarterly")).toBe("2027-02-28");
    expect(nextRenewal("2028-02-29", "yearly", 29)).toBe("2029-02-28");
  });

  it("keeps the billing anchor so month ends do not drift", () => {
    expect(nextRenewal("2027-01-31", "monthly", 31)).toBe("2027-02-28");
    expect(nextRenewal("2027-02-28", "monthly", 31)).toBe("2027-03-31");
    expect(nextRenewal("2028-01-31", "monthly", 31)).toBe("2028-02-29");
    expect(nextRenewal("2027-04-30", "monthly", 31)).toBe("2027-05-31");
  });
});

describe("due renewals", () => {
  it("lists every passed renewal up to and including today, and the next one", () => {
    expect(dueRenewals("2026-09-17", "2026-11-17", "monthly", 17)).toEqual({
      due: ["2026-09-17", "2026-10-17", "2026-11-17"], next: "2026-12-17",
    });
  });

  it("records nothing for a future renewal", () => {
    expect(dueRenewals("2026-11-18", "2026-11-17", "monthly", 18)).toEqual({ due: [], next: "2026-11-18" });
  });

  it("caps a renewal date set far in the past", () => {
    expect(dueRenewals("1990-01-01", "2026-11-17", "weekly").due).toHaveLength(120);
  });
});

describe("monthly equivalent", () => {
  it("converts each cycle to a per-month figure in cents", () => {
    expect(monthlyEquivalentCents(2000n, "monthly")).toBe(2000n);
    expect(monthlyEquivalentCents(1000n, "weekly")).toBe(4333n); // 10.00 * 52 / 12
    expect(monthlyEquivalentCents(30000n, "quarterly")).toBe(10000n);
    expect(monthlyEquivalentCents(24000n, "yearly")).toBe(2000n);
  });
});
