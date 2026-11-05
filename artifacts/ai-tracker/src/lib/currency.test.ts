import { describe, it, expect } from "vitest";
import { formatCurrency, normalizeCurrencyCode, totalsByCurrency } from "./currency";

describe("totalsByCurrency", () => {
  it("treats differently-cased codes as one currency and never mixes currencies", () => {
    const totals = totalsByCurrency([
      { amount: 10.1, currency: "USD" },
      { amount: 0.2, currency: "usd" },
      { amount: 5, currency: " EUR " },
      { amount: -2.5, currency: "EUR" },
    ]);
    expect([...totals]).toEqual([["USD", 10.3], ["EUR", 2.5]]);
  });

  it("sums in cents so many small amounts stay exact", () => {
    const totals = totalsByCurrency(Array.from({ length: 1000 }, () => ({ amount: 0.1, currency: "USD" })));
    expect(totals.get("USD")).toBe(100);
  });

  it("defaults a missing code to USD, matching the database default", () => {
    expect(normalizeCurrencyCode(undefined)).toBe("USD");
  });
});

describe("formatCurrency", () => {
  it("labels unknown currencies with their own code instead of a dollar sign", () => {
    expect(formatCurrency(12, "AED")).toBe("12.00 AED");
  });
});
