import { describe, it, expect } from "vitest";
import { expensesTable } from "./schema/expenses";

describe("Database Schema", () => {
  it("should have correct table name for expenses", () => {
    const tableNameSymbol = Object.getOwnPropertySymbols(expensesTable).find(
      (sym) => sym.toString() === "Symbol(drizzle:BaseName)" || sym.toString() === "Symbol(drizzle:Name)"
    );
    const tableName = tableNameSymbol ? (expensesTable as any)[tableNameSymbol] : undefined;
    expect(tableName).toBe("expenses");
  });

  it("should have required user_id column in expenses", () => {
    expect(expensesTable.userId).toBeDefined();
    expect(expensesTable.userId.name).toBe("user_id");
  });
});
