import { describe, it, expect } from "vitest";
import { expensesTable } from "./schema/expenses";

describe("Database Schema", () => {
  it("should have correct table name for expenses", () => {
    expect(expensesTable._.name).toBe("expenses");
  });

  it("should have required user_id column in expenses", () => {
    expect(expensesTable.userId).toBeDefined();
    expect(expensesTable.userId.name).toBe("user_id");
  });
});
