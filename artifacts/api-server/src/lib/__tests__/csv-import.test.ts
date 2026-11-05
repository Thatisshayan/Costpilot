import { describe, expect, it } from "vitest";
import { checkRowFields, ImportRequest, matchKey, MAX_IMPORT_ROWS } from "../csv-import";

const row = (extra: Record<string, unknown> = {}) => ({ rowNumber: 2, date: "2026-09-03", amount: "100.10", currency: "usd", ...extra });

describe("CSV row fields", () => {
  it("keeps exact signed amounts in cents and uppercases the currency", () => {
    expect(checkRowFields(ImportRequest.parse({ fileName: "a.csv", rows: [row()] }).rows[0])).toMatchObject({ row: { amountCents: 10010n, currency: "USD" } });
    expect(checkRowFields(row({ amount: "-4.5" }) as never)).toMatchObject({ row: { amountCents: -450n } });
  });

  it.each([
    [{ amount: "" }, /Amount/], [{ amount: "abc" }, /Amount/], [{ amount: "1.234" }, /Amount/], [{ amount: "1,000.00" }, /Amount/],
    [{ amount: "$5" }, /Amount/], [{ amount: "1e3" }, /Amount/], [{ date: "2026-02-30" }, /Date/], [{ date: "03/09/2026" }, /Date/],
    [{ currency: "dollars" }, /Currency/], [{ currency: "" }, /Currency/],
  ])("rejects %j instead of defaulting it", (extra, message) => {
    const result = checkRowFields(row(extra) as never);
    expect("messages" in result && result.messages.join(" ")).toMatch(message);
  });

  it("reports an over-long cell on its own row instead of rejecting the file", () => {
    const parsed = ImportRequest.parse({ fileName: "a.csv", rows: [row({ description: "x".repeat(501), externalId: "y".repeat(201) })] }).rows[0];
    const result = checkRowFields(parsed);
    expect("messages" in result && result.messages).toEqual(["Description must be at most 500 characters.", "Transaction ID must be at most 200 characters."]);
  });

  it("reports every problem in a row at once", () => {
    const result = checkRowFields(row({ amount: "x", date: "x", currency: "x" }) as never);
    expect("messages" in result && result.messages).toHaveLength(3);
  });
});

describe("import request limits", () => {
  it(`accepts up to ${MAX_IMPORT_ROWS} rows and rejects more`, () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => row({ rowNumber: i + 2 }));
    expect(ImportRequest.safeParse({ fileName: "a.csv", rows: rows(MAX_IMPORT_ROWS) }).success).toBe(true);
    expect(ImportRequest.safeParse({ fileName: "a.csv", rows: rows(MAX_IMPORT_ROWS + 1) }).success).toBe(false);
  });

  it("rejects unknown keys, oversized text, empty files and repeated row numbers", () => {
    expect(ImportRequest.safeParse({ fileName: "a.csv", rows: [row({ evil: 1 })] }).success).toBe(false);
    expect(ImportRequest.safeParse({ fileName: "a.csv", rows: [row({ description: "x".repeat(2001) })] }).success).toBe(false);
    expect(ImportRequest.safeParse({ fileName: "a.csv", rows: [] }).success).toBe(false);
    expect(ImportRequest.safeParse({ fileName: "a.csv", rows: [row(), row()] }).success).toBe(false);
  });

  it("treats blank optional text as absent", () => {
    expect(ImportRequest.parse({ fileName: "a.csv", rows: [row({ vendor: "  ", externalId: "" })] }).rows[0]).not.toHaveProperty("vendor", "  ");
  });
});

describe("duplicate match key", () => {
  it("ignores description case and surrounding spaces but not amount, currency or vendor", () => {
    const base = { date: "2026-09-03", amountCents: 1000n, currency: "USD", platformId: 1, projectId: null, description: "AWS bill" };
    expect(matchKey(base)).toBe(matchKey({ ...base, description: " aws BILL " }));
    expect(matchKey(base)).not.toBe(matchKey({ ...base, amountCents: 1001n }));
    expect(matchKey(base)).not.toBe(matchKey({ ...base, currency: "EUR" }));
    expect(matchKey(base)).not.toBe(matchKey({ ...base, platformId: 2 }));
  });
});
