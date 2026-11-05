import { describe, expect, it } from "vitest";
import { parseThresholds, validateBudgetForm } from "./budget-form";

describe("budget form", () => {
  it("parses ascending whole percentages", () => {
    expect(parseThresholds("50, 80,100")).toEqual([50, 80, 100]);
    expect(parseThresholds("100")).toEqual([100]);
    for (const bad of ["", "80, 50", "50, 50", "0", "101", "1,2,3,4,5,6", "50.5", "abc"]) expect(parseThresholds(bad)).toBeNull();
  });

  it("mirrors the API's amount rules", () => {
    const base = { name: "Cloud", currency: "USD", thresholds: "50" };
    expect(validateBudgetForm({ ...base, amount: "1250.50" })).toEqual({});
    for (const bad of ["0", "0.00", "-5", "1.234", "1e3", "", "12345678901"]) expect(validateBudgetForm({ ...base, amount: bad }).amount).toBeTruthy();
  });

  it("requires a name and, when creating, a currency", () => {
    expect(validateBudgetForm({ name: " ", amount: "5", currency: "", thresholds: "50" })).toMatchObject({ name: expect.any(String), currency: expect.any(String) });
    expect(validateBudgetForm({ name: "x", amount: "5", currency: "", thresholds: "50" }, { requireCurrency: false })).toEqual({});
  });
});
