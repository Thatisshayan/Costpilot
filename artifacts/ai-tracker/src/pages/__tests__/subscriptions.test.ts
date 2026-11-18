import { describe, expect, it } from "vitest";
import type { Subscription } from "@workspace/api-client-react";
import { formIssue, monthlyTotals } from "../subscriptions";
import { upcoming } from "@/components/upcoming-renewals";

const base = {
  name: "Claude Max", amount: "200", currency: "USD", billingCycle: "monthly" as const, status: "active" as const,
  nextRenewalDate: "2026-11-30", trialEndDate: "", platformId: "", autoRecord: true, notes: "",
};

const sub = (over: Partial<Subscription>): Subscription => ({
  id: 1, name: "X", amount: "10.00", currency: "USD", billingCycle: "monthly", monthlyEquivalent: "10.00",
  status: "active", autoRecord: true, createdAt: "2026-11-01T00:00:00Z", nextRenewalDate: null, trialEndDate: null, ...over,
});

describe("subscription form checks", () => {
  it("accepts a complete active plan", () => {
    expect(formIssue(base)).toBeNull();
  });
  it("asks for what is missing", () => {
    expect(formIssue({ ...base, name: " " })).toMatch(/name/);
    expect(formIssue({ ...base, amount: "twenty" })).toMatch(/price/);
    expect(formIssue({ ...base, amount: "19.999" })).toMatch(/price/);
    expect(formIssue({ ...base, currency: "US" })).toMatch(/Currency/);
    expect(formIssue({ ...base, nextRenewalDate: "" })).toMatch(/next charge/);
    expect(formIssue({ ...base, status: "trial" })).toMatch(/trial ends/);
    expect(formIssue({ ...base, status: "paused", nextRenewalDate: "" })).toBeNull();
  });
});

describe("monthly totals", () => {
  it("sums active plans per currency and ignores the rest", () => {
    expect(monthlyTotals([
      sub({ monthlyEquivalent: "200.00" }), sub({ monthlyEquivalent: "20.00" }),
      sub({ monthlyEquivalent: "9.99", currency: "EUR" }), sub({ monthlyEquivalent: "50.00", status: "cancelled" }),
    ])).toEqual([{ currency: "USD", amount: "220.00" }, { currency: "EUR", amount: "9.99" }]);
  });
});

describe("upcoming renewals", () => {
  it("lists active renewals and trial ends within the window, soonest first", () => {
    const items = upcoming([
      sub({ id: 1, name: "Later", nextRenewalDate: "2026-11-30" }),
      sub({ id: 2, name: "Soon", nextRenewalDate: "2026-11-20" }),
      sub({ id: 3, name: "Trial", status: "trial", trialEndDate: "2026-11-25" }),
      sub({ id: 4, name: "Too far", nextRenewalDate: "2026-12-30" }),
      sub({ id: 5, name: "Paused", status: "paused", nextRenewalDate: "2026-11-19" }),
    ], "2026-11-17");
    expect(items.map(i => [i.sub.name, i.date, i.trial])).toEqual([
      ["Soon", "2026-11-20", false], ["Trial", "2026-11-25", true], ["Later", "2026-11-30", false],
    ]);
  });
});
