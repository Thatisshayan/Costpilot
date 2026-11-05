import { describe, expect, it } from "vitest";
import { categoryOptions, currencyOptions, fieldForServerMessage, validateExpenseForm } from "./expense-form";
import { apiErrorMessage, apiFieldErrors } from "./api-error";

const valid = { amount: "12.50", currency: "eur", date: "2026-02-28" };

describe("expense form rules mirror the API", () => {
  it("accepts a valid expense (currency case is normalised by the server)", () => {
    expect(validateExpenseForm(valid)).toEqual({});
  });
  it.each([
    ["", "Enter an amount."],
    ["-3", "Enter a positive number"],
    ["1.234", "Use at most 2 decimal places."],
    ["0", "greater than zero"],
    ["100000000", "99,999,999.99 or less"],
    ["1e3", "Enter a positive number"],
  ])("rejects amount %j", (amount, message) => {
    expect(validateExpenseForm({ ...valid, amount }).amount).toContain(message);
  });
  it("rejects impossible dates and non-ISO currencies", () => {
    expect(validateExpenseForm({ ...valid, date: "2026-02-30" }).date).toBeTruthy();
    expect(validateExpenseForm({ ...valid, date: "" }).date).toBeTruthy();
    expect(validateExpenseForm({ ...valid, currency: "US" }).currency).toBeTruthy();
  });
  it("maps server messages to fields", () => {
    expect(fieldForServerMessage("amount must have at most 2 decimal places")).toBe("amount");
    expect(fieldForServerMessage("Platform and project must belong to the selected scope")).toBeNull();
  });
  it("keeps legacy categories and unusual currencies selectable when editing", () => {
    expect(categoryOptions("Model Fine-Tuning")[0]).toBe("Model Fine-Tuning");
    expect(categoryOptions("Compute")).not.toContain("Model Fine-Tuning");
    expect(currencyOptions("XAF")).toContain("XAF");
    expect(currencyOptions().slice(0, 3)).toEqual(["USD", "EUR", "GBP"]);
  });
});

describe("API error messages", () => {
  it("prefers the server's explanation and per-field details", () => {
    const zod = { status: 400, data: { error: "Bad Request", details: [{ path: "currency", message: "Invalid string" }] } };
    expect(apiErrorMessage(zod, "fallback")).toBe("currency: Invalid string");
    expect(apiFieldErrors(zod)).toEqual({ currency: "Invalid string" });
    expect(apiErrorMessage({ status: 409, data: { error: "User is already a member of this workspace" } }, "x")).toBe("User is already a member of this workspace");
  });
  it("gives actionable defaults without leaking internals", () => {
    expect(apiErrorMessage({ status: 403, data: { error: "Forbidden" } }, "x")).toMatch(/permission/);
    expect(apiErrorMessage({ status: 500, data: { error: "InternalServerError", message: "An unexpected error occurred. Please try again later." } }, "x"))
      .toBe("An unexpected error occurred. Please try again later.");
    expect(apiErrorMessage(new Error("network"), "fallback")).toBe("fallback");
  });
});
