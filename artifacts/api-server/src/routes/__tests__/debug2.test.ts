import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response } from "express";

vi.mock("@workspace/db", () => ({
  db: { select: vi.fn(), transaction: vi.fn() },
  expensesTable: {},
  platformsTable: {},
  projectsTable: {},
  subscriptionsTable: {},
  toolsTable: {},
  budgetPoliciesTable: {},
  remediationActionsTable: {},
  creditPurchasesTable: {},
  workspaceMembersTable: {},
}));

describe("debug", () => {
  it("inspect stack", () => {
    import("../dashboard").then((mod) => {
      console.log(JSON.stringify(
        mod.default.stack.map((l: any) => ({
          route: l.route?.path,
          handleType: l.handle?.name || l.handle?.constructor?.name || typeof l.handle
        })),
        null, 2
      ));
    });
  });
});
