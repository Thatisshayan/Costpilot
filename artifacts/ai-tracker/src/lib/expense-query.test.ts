import { describe, expect, it } from "vitest";
import {
  EMPTY_QUERY, MAX_PAGE, hasActiveFilters, parseExpenseQuery, serializeExpenseQuery, toExportFilters, toSearchParams, validateExpenseQuery,
} from "./expense-query";

describe("expense query string", () => {
  it("round-trips every API filter name plus a 1-based page", () => {
    const qs = "q=aws&from=2026-09-01&to=2026-09-30&minAmount=-5.5&maxAmount=100&platformId=12&projectId=none&category=Compute&currency=USD&entryType=credit&sort=amount_asc&page=3";
    const query = parseExpenseQuery(`?${qs}`);
    expect(query).toEqual({ q: "aws", from: "2026-09-01", to: "2026-09-30", minAmount: "-5.5", maxAmount: "100", platformId: "12", projectId: "none",
      category: "Compute", currency: "USD", entryType: "credit", sort: "amount_asc", page: 3 });
    expect(parseExpenseQuery(serializeExpenseQuery(query))).toEqual(query);
  });
  it("keeps an empty category (uncategorised) distinct from no category filter", () => {
    expect(parseExpenseQuery("category=").category).toBe("");
    expect(parseExpenseQuery("").category).toBeUndefined();
    expect(serializeExpenseQuery({ ...EMPTY_QUERY, category: "" })).toBe("category=");
  });
  it("ignores unknown keys and malformed sort, type and page values", () => {
    expect(parseExpenseQuery("sort=evil&entryType=x&page=-2&page=abc&foo=1")).toEqual(EMPTY_QUERY);
    expect(serializeExpenseQuery(EMPTY_QUERY)).toBe("");
    expect(hasActiveFilters(EMPTY_QUERY)).toBe(false);
  });
});

describe("filter validation", () => {
  it("rejects impossible dates, reversed ranges and malformed amounts", () => {
    expect(validateExpenseQuery({ ...EMPTY_QUERY, from: "2026-02-30" }).from).toBeTruthy();
    expect(validateExpenseQuery({ ...EMPTY_QUERY, from: "2026-09-30", to: "2026-09-01" }).from).toMatch(/on or before/);
    expect(validateExpenseQuery({ ...EMPTY_QUERY, minAmount: "1.234" }).minAmount).toBeTruthy();
    expect(validateExpenseQuery({ ...EMPTY_QUERY, maxAmount: "1e3" }).maxAmount).toBeTruthy();
    expect(validateExpenseQuery({ ...EMPTY_QUERY, minAmount: "10", maxAmount: "5" }).minAmount).toMatch(/larger/);
    expect(validateExpenseQuery({ ...EMPTY_QUERY, minAmount: "-5.50", maxAmount: "99999999.99", from: "2024-02-29" })).toEqual({});
  });
});

describe("API parameters", () => {
  it("maps page to offset and omits workspaceId for Personal", () => {
    expect(toSearchParams({ ...EMPTY_QUERY, page: 3 }, null)).toEqual({ sort: "date_desc", limit: 25, offset: 50 });
    expect(toSearchParams({ ...EMPTY_QUERY, currency: "EUR" }, 7)).toEqual({ workspaceId: 7, currency: "EUR", sort: "date_desc", limit: 25, offset: 0 });
  });
  it("exports the same filters without sort or paging", () => {
    expect(toExportFilters({ ...EMPTY_QUERY, sort: "amount_asc", page: 4 })).toBeUndefined();
    expect(toExportFilters({ ...EMPTY_QUERY, from: "2026-09-01", category: "" })).toEqual({ from: "2026-09-01", category: "" });
  });
});

describe("deep-link limits", () => {
  it("clamps the page so the offset stays within the API limit", () => {
    expect(MAX_PAGE).toBe(40001);
    const query = parseExpenseQuery("?page=999999");
    expect(query.page).toBe(40001);
    expect(toSearchParams(query, null).offset).toBe(1_000_000);
  });

  it("accepts dates in years 0-99 instead of treating them as 1900-1999", () => {
    expect(validateExpenseQuery({ ...EMPTY_QUERY, from: "0096-02-29" })).toEqual({});
  });
});
