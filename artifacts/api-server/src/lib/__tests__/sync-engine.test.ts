import { describe, it, expect, vi } from "vitest";

vi.mock("../kms-vault", () => ({
  encrypt: (val: string) => val,
  decrypt: (val: string) => val,
}));

vi.mock("@workspace/db", () => ({
  db: {
    execute: () => Promise.resolve(),
    select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    insert: () => ({ values: () => ({ returning: () => Promise.resolve([{ id: 1 }]) }) }),
    delete: () => ({ where: () => Promise.resolve() }),
  },
  platformsTable: {},
  expensesTable: {},
}));

import { parseCSV } from "../sync-engine";

describe("parseCSV", () => {
  it("should parse a simple CSV with headers and rows", () => {
    const csv = `name,age,city
Alice,30,New York
Bob,25,Los Angeles`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(["name", "age", "city"]);
    expect(result[1]).toEqual(["Alice", "30", "New York"]);
    expect(result[2]).toEqual(["Bob", "25", "Los Angeles"]);
  });

  it("should parse quoted fields containing commas", () => {
    const csv = `item,description,price
1,"Super AI, GPT-4o, turbo",99.99
2,"Standard, basic",9.99`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual(["1", "Super AI, GPT-4o, turbo", "99.99"]);
    expect(result[2]).toEqual(["2", "Standard, basic", "9.99"]);
  });

  it("should handle quoted fields with escaped quotes", () => {
    const csv = `key,value
1,"he said ""hello"" world"`;
    const result = parseCSV(csv);
    expect(result[1]).toEqual(["1", 'he said "hello" world']);
  });

  it("should skip empty lines", () => {
    const csv = `a,b,c
1,2,3

4,5,6

`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(["a", "b", "c"]);
    expect(result[1]).toEqual(["1", "2", "3"]);
    expect(result[2]).toEqual(["4", "5", "6"]);
  });

  it("should handle Windows-style CRLF line endings", () => {
    const csv = "col1,col2\r\nval1,val2\r\nval3,val4";
    const result = parseCSV(csv);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual(["val1", "val2"]);
    expect(result[2]).toEqual(["val3", "val4"]);
  });

  it("should trim whitespace from values", () => {
    const csv = `name, value
  Alice, 30  `;
    const result = parseCSV(csv);
    expect(result[1]).toEqual(["Alice", "30"]);
  });

  it("should handle single row", () => {
    const csv = "only,row";
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(["only", "row"]);
  });

  it("should return empty array for empty string", () => {
    const result = parseCSV("");
    expect(result).toEqual([]);
  });
});
