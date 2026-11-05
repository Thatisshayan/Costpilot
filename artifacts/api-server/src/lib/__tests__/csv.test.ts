import { describe, expect, it } from "vitest";
import { csvCell } from "../csv";
describe("CSV cell safety", () => {
  it("escapes quotes, commas and line breaks in one quoted cell", () => {
    expect(csvCell('two, "quoted"\nlines')).toBe('"two, ""quoted""\nlines"');
  });
  it("neutralizes formulas after leading whitespace and still escapes quotes", () => {
    expect(csvCell('  =HYPERLINK("link")')).toBe('"\'  =HYPERLINK(""link"")"');
  });
  it("keeps numbers and absent values as cells", () => {
    expect(csvCell(12.5)).toBe('"12.5"');
    expect(csvCell(-12.5)).toBe('"-12.5"');
    expect(csvCell("-1+CMD()")).toBe('"\'-1+CMD()"');
    expect(csvCell(null)).toBe('""');
  });
  it("neutralizes cells that start with a tab or carriage return", () => {
    expect(csvCell("\tfoo")).toBe('"\'\tfoo"');
    expect(csvCell("\rfoo")).toBe('"\'\rfoo"');
    expect(csvCell("plain text")).toBe('"plain text"');
  });
});
