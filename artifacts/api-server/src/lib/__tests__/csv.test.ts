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
  it("keeps exact signed decimal strings (money) unescaped but still neutralizes look-alikes", () => {
    expect(csvCell("-4.50")).toBe('"-4.50"');
    expect(csvCell("1500.00")).toBe('"1500.00"');
    for (const formula of ["-4.50+1", "-1.2.3", "-.5", "-", "- 4", "-4e3", "=1", "+4.50", "@SUM(A1)"]) {
      expect(csvCell(formula)).toBe(`"'${formula}"`);
    }
  });
  it("neutralizes cells that start with a tab or carriage return", () => {
    expect(csvCell("\tfoo")).toBe('"\'\tfoo"');
    expect(csvCell("\rfoo")).toBe('"\'\rfoo"');
    expect(csvCell("plain text")).toBe('"plain text"');
  });
});
