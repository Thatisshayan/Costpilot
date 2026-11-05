import { describe, expect, it } from "vitest";
import { formatMoney, formatSignedMoney, isNegative } from "./money-format";

describe("currency-aware formatting", () => {
  it("uses each currency's minor units", () => {
    expect(formatMoney("1500.00", "JPY", "en-US")).toBe("¥1,500");
    // Recorded cents are never hidden, even for a zero-decimal currency.
    expect(formatMoney("1500.49", "JPY", "en-US")).toBe("¥1,500.49");
    expect(formatMoney(-0.5, "JPY", "en-US")).toBe("-¥0.50");
    expect(formatMoney("80.30", "USD", "en-US")).toBe("$80.30");
    expect(formatMoney("50.00", "EUR", "en-US")).toBe("€50.00");
    expect(formatMoney("1.5", "KWD", "en-US").replace(/\s/g, " ")).toBe("KWD 1.500");
  });
  it("keeps the sign of credits", () => {
    expect(formatMoney("-20.00", "USD", "en-US")).toBe("-$20.00");
    expect(isNegative("-20.00")).toBe(true);
    expect(isNegative("0.00")).toBe(false);
  });
  it("formats signed comparisons", () => {
    expect(formatSignedMoney("0.30", "USD", "en-US")).toBe("+$0.30");
    expect(formatSignedMoney("-4.00", "USD", "en-US")).toBe("-$4.00");
    expect(formatSignedMoney("0.00", "USD", "en-US")).toBe("$0.00");
  });
  it("never invents a conversion for unknown codes", () => {
    expect(formatMoney("12.00", "ZZZ", "en-US")).toMatch(/12\.00/);
  });
});
