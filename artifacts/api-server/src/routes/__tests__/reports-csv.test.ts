import { describe, it, expect, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {},
  expensesTable: {},
  platformsTable: {},
  projectsTable: {},
}));

import { sanitizeCsvField } from "../reports";

describe("sanitizeCsvField (CSV formula-injection guard)", () => {
  it("should escape double quotes", () => {
    expect(sanitizeCsvField('say "hi"')).toBe('say ""hi""');
  });

  it("should prefix formulas with a single quote to neutralize injection", () => {
    expect(sanitizeCsvField('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(sanitizeCsvField("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(sanitizeCsvField("-1+2")).toBe("'-1+2");
    expect(sanitizeCsvField("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("should not mutate ordinary text or empty/null values", () => {
    expect(sanitizeCsvField("plain description")).toBe("plain description");
    expect(sanitizeCsvField("")).toBe("");
    expect(sanitizeCsvField(null)).toBe("");
    expect(sanitizeCsvField(undefined)).toBe("");
  });

  it("should trim leading whitespace before checking for formula tokens", () => {
    expect(sanitizeCsvField(" =1+1")).toBe("'=1+1");
  });
});