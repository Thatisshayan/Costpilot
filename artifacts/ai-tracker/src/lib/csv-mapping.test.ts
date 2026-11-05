import { describe, expect, it } from "vitest";
import { buildRows, guessMapping, mappingIssues } from "./csv-mapping";

describe("CSV column mapping", () => {
  it("guesses common provider export headers, each column used once", () => {
    const m = guessMapping(["Invoice ID", "Usage Date", "Service", "Cost", "Currency Code", "Provider"]);
    expect(m).toMatchObject({ date: "Usage Date", amount: "Cost", currency: "Currency Code", description: "Service", vendor: "Provider", externalId: "Invoice ID" });
    expect(guessMapping(["foo", "bar"]).date).toBe("");
  });

  it("requires date, amount and a currency column or a fixed currency, without reusing columns", () => {
    const m = guessMapping(["Date", "Amount"]);
    expect(mappingIssues(m, "")).toEqual(["Choose a currency column, or the one currency every row uses."]);
    expect(mappingIssues(m, "EUR")).toEqual([]);
    expect(mappingIssues({ ...m, description: "Amount" }, "EUR")).toContain("Each column can be used for only one field.");
    expect(mappingIssues({ ...m, amount: "" }, "EUR")).toContain("Choose the column that holds the amount.");
  });

  it("sends cells as text with file line numbers, never parsing or defaulting values", () => {
    const m = guessMapping(["Date", "Amount", "Vendor", "Memo"]);
    const rows = buildRows([
      { Date: "2026-09-03", Amount: " -4.50 ", Vendor: "AWS", Memo: "" },
      { Date: "", Amount: "abc", Vendor: "", Memo: "x" },
    ], m, "USD");
    expect(rows).toEqual([
      { rowNumber: 2, date: "2026-09-03", amount: "-4.50", currency: "USD", vendor: "AWS" },
      { rowNumber: 3, date: "", amount: "abc", currency: "USD", description: "x" },
    ]);
  });
});
