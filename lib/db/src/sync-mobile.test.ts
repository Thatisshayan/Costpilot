import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock DATABASE_URL so that the db client initialization does not crash
process.env.DATABASE_URL = "postgresql://mock_user:mock_password@localhost:5432/mock_db";

import {
  db,
  expensesTable,
  projectsTable,
  subscriptionsTable,
  workspaceMembersTable,
  platformsTable,
} from "./index";

import syncMobileRouter from "c:/Users/Shaya/AIExpenseTracker/AIexpenseTracker/artifacts/api-server/src/routes/sync-mobile";

// Extract handlers safely from the router
let pullHandler: any;
let pushHandler: any;

for (const layer of syncMobileRouter.stack) {
  if (layer.route && layer.route.path === "/") {
    for (const routeStack of layer.route.stack) {
      if (routeStack.method === "get") {
        pullHandler = routeStack.handle;
      } else if (routeStack.method === "post") {
        pushHandler = routeStack.handle;
      }
    }
  }
}

// Setup mock helper for express Request / Response
const makeMockRequest = (
  method: "GET" | "POST",
  userId: string,
  workspaceId: number,
  queryParams: Record<string, any> = {},
  body: any = {}
) => ({
  method,
  userId,
  query: {
    workspaceId: String(workspaceId),
    ...queryParams,
  },
  headers: {
    "x-workspace-id": String(workspaceId),
    "x-user-id": userId,
  },
  body,
});

const makeMockResponse = () => {
  const res: any = {};
  res.statusCode = 200;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

// Helper to recursively extract primitives (numbers/strings/dates) from a Drizzle query object safely (handles circular references)
function extractPrimitives(obj: any, res: any[] = [], visited = new Set<any>()): any[] {
  if (obj === null || obj === undefined) return res;
  if (typeof obj === "object") {
    if (visited.has(obj)) return res;
    visited.add(obj);
  }
  if (obj instanceof Date) {
    res.push(obj);
    return res;
  }
  if (typeof obj === "number" || typeof obj === "string" || typeof obj === "boolean") {
    res.push(obj);
    return res;
  }
  if (typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      try {
        extractPrimitives(obj[key], res, visited);
      } catch {}
    }
  }
  return res;
}

describe("Mobile Offline Incremental Sync Pull/Push Engine", () => {
  let activeWorkspaceId = 1;
  let activePullDate = new Date(0);

  let mockDbState = {
    workspaceMembers: [] as any[],
    projects: [] as any[],
    expenses: [] as any[],
    subscriptions: [] as any[],
    platforms: [] as any[],
  };

  function getTableState(table: any) {
    if (table === workspaceMembersTable) return mockDbState.workspaceMembers;
    if (table === projectsTable) return mockDbState.projects;
    if (table === expensesTable) return mockDbState.expenses;
    if (table === subscriptionsTable) return mockDbState.subscriptions;
    if (table === platformsTable) return mockDbState.platforms;
    return [];
  }

  beforeEach(() => {
    activeWorkspaceId = 1;
    activePullDate = new Date(0);

    // Seed mock database state
    mockDbState = {
      workspaceMembers: [
        { id: 1, workspaceId: 1, userId: "user_test_123", role: "admin" },
      ],
      projects: [],
      expenses: [],
      subscriptions: [],
      platforms: [
        { id: 10, workspaceId: 1, name: "Vercel" },
      ],
    };

    vi.restoreAllMocks();

    // Mock db.select
    vi.spyOn(db, "select").mockImplementation((...selectArgs: any[]) => {
      return {
        from: (table: any) => {
          return {
            where: (whereClause: any) => {
              return {
                then: (resolve: any) => {
                  if (table === workspaceMembersTable) {
                    const primitives = extractPrimitives(whereClause);
                    const matched = mockDbState.workspaceMembers.filter(
                      (m) =>
                        primitives.includes(m.workspaceId) &&
                        primitives.includes(m.userId)
                    );
                    return resolve(matched);
                  }

                  if (table === projectsTable) {
                    const primitives = extractPrimitives(whereClause);
                    // Differentiate validate helper vs pull query
                    const projectIdMatches = mockDbState.projects.filter((p) =>
                      primitives.includes(p.id) && primitives.includes(p.workspaceId)
                    );
                    if (projectIdMatches.length > 0) {
                      return resolve(projectIdMatches);
                    }

                    // Otherwise return filtered pull results
                    const results = mockDbState.projects.filter(
                      (p) =>
                        p.workspaceId === activeWorkspaceId &&
                        p.createdAt > activePullDate
                    );
                    return resolve(results);
                  }

                  if (table === expensesTable) {
                    const results = mockDbState.expenses.filter(
                      (e) =>
                        e.workspaceId === activeWorkspaceId &&
                        e.createdAt > activePullDate
                    );
                    return resolve(results);
                  }

                  if (table === subscriptionsTable) {
                    const results = mockDbState.subscriptions.filter(
                      (s) =>
                        s.workspaceId === activeWorkspaceId &&
                        s.createdAt > activePullDate
                    );
                    return resolve(results);
                  }

                  if (table === platformsTable) {
                    const primitives = extractPrimitives(whereClause);
                    const platformIdMatches = mockDbState.platforms.filter((p) =>
                      primitives.includes(p.id) && primitives.includes(p.workspaceId)
                    );
                    if (platformIdMatches.length > 0) {
                      return resolve(platformIdMatches);
                    }
                    const results = mockDbState.platforms.filter(
                      (p) => p.workspaceId === activeWorkspaceId
                    );
                    return resolve(results);
                  }

                  return resolve([]);
                },
              };
            },
          };
        },
      } as any;
    });

    // Mock db.insert
    vi.spyOn(db, "insert").mockImplementation((table: any) => {
      return {
        values: (vals: any) => {
          return {
            returning: () => {
              const tableState = getTableState(table);
              const nextId =
                tableState.length > 0
                  ? Math.max(...tableState.map((r: any) => r.id)) + 1
                  : 1;
              const insertedRow = {
                id: nextId,
                createdAt: new Date(),
                ...vals,
              };
              tableState.push(insertedRow);
              return [insertedRow];
            },
          };
        },
      } as any;
    });

    // Mock db.update
    vi.spyOn(db, "update").mockImplementation((table: any) => {
      return {
        set: (updateData: any) => {
          return {
            where: (whereClause: any) => {
              return {
                then: (resolve: any) => {
                  const primitives = extractPrimitives(whereClause);
                  const tableState = getTableState(table);
                  const row = tableState.find((r: any) => primitives.includes(r.id));
                  if (row) {
                    Object.assign(row, updateData);
                  }
                  return resolve();
                },
              };
            },
          };
        },
      } as any;
    });

    // Mock db.delete
    vi.spyOn(db, "delete").mockImplementation((table: any) => {
      return {
        where: (whereClause: any) => {
          return {
            then: (resolve: any) => {
              const primitives = extractPrimitives(whereClause);
              const tableState = getTableState(table);
              const index = tableState.findIndex((r: any) => primitives.includes(r.id));
              if (index !== -1) {
                tableState.splice(index, 1);
              }
              return resolve();
            },
          };
        },
      } as any;
    });

    // Mock db.transaction
    vi.spyOn(db, "transaction").mockImplementation(async (callback: any) => {
      return callback(db);
    });
  });

  describe("Introspection check", () => {
    it("should successfully extract router handlers", () => {
      expect(pullHandler).toBeDefined();
      expect(pushHandler).toBeDefined();
    });
  });

  describe("PULL ENDPOINT (GET)", () => {
    it("should REJECT access (403 Forbidden) if user is not a member of the workspace", async () => {
      mockDbState.workspaceMembers = []; // No membership

      const req = makeMockRequest("GET", "user_test_123", 1, { lastPulledAt: "0" });
      const res = makeMockResponse();

      await pullHandler(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData.error).toContain("Forbidden");
    });

    it("should return projects, expenses, subscriptions created/updated after lastPulledAt", async () => {
      activeWorkspaceId = 1;
      const fiveHoursAgo = Date.now() - 5 * 60 * 60 * 1000;
      activePullDate = new Date(fiveHoursAgo);

      // Seed projects
      mockDbState.projects = [
        {
          id: 201,
          workspaceId: 1,
          userId: "user_test_123",
          name: "Project New",
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hr ago (should return)
        },
        {
          id: 202,
          workspaceId: 1,
          userId: "user_test_123",
          name: "Project Old",
          createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hrs ago (should skip)
        },
      ];

      // Seed expenses
      mockDbState.expenses = [
        {
          id: 301,
          workspaceId: 1,
          userId: "user_test_123",
          amount: "150.75",
          currency: "USD",
          description: "New Laptop",
          date: "2026-06-03",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hrs ago (should return)
        },
      ];

      // Seed subscriptions
      mockDbState.subscriptions = [
        {
          id: 401,
          workspaceId: 1,
          userId: "user_test_123",
          platformId: 10,
          planName: "Pro Plan",
          planType: "monthly",
          monthlyCost: "19.99",
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hrs ago (should return)
        },
      ];

      const req = makeMockRequest("GET", "user_test_123", 1, { lastPulledAt: String(fiveHoursAgo) });
      const res = makeMockResponse();

      await pullHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.serverTimestamp).toBeDefined();

      // Verify lists
      expect(res.jsonData.projects).toHaveLength(1);
      expect(res.jsonData.projects[0].id).toBe(201);
      expect(res.jsonData.projects[0].name).toBe("Project New");

      expect(res.jsonData.expenses).toHaveLength(1);
      expect(res.jsonData.expenses[0].id).toBe(301);
      expect(res.jsonData.expenses[0].amount).toBe(150.75); // Cast to Number

      expect(res.jsonData.subscriptions).toHaveLength(1);
      expect(res.jsonData.subscriptions[0].id).toBe(401);
      expect(res.jsonData.subscriptions[0].monthlyCost).toBe(19.99); // Cast to Number
    });
  });

  describe("PUSH ENDPOINT (POST)", () => {
    it("should REJECT push if user is not a member of the workspace (IDOR prevention)", async () => {
      mockDbState.workspaceMembers = []; // No membership

      const req = makeMockRequest("POST", "user_test_123", 1, {}, {
        changes: {
          projects: {
            created: [{ id: "temp-1", name: "Offline Project" }],
          },
        },
      });
      const res = makeMockResponse();

      await pushHandler(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData.error).toContain("Forbidden");
      expect(mockDbState.projects).toHaveLength(0);
    });

    it("should insert offline-created entities, resolve temporary project IDs, and verify foreign key bounds", async () => {
      const req = makeMockRequest("POST", "user_test_123", 1, {}, {
        changes: {
          projects: {
            created: [
              {
                id: "client-proj-111", // Temporary client ID
                name: "Offline Project Alpha",
              },
            ],
          },
          expenses: {
            created: [
              {
                id: "client-exp-222", // Temporary client ID
                projectId: "client-proj-111", // Reference to the offline created project!
                amount: 85.5,
                currency: "USD",
                date: "2026-06-03",
                description: "Offline Expense",
                platformId: 10, // Valid seeded platformId
              },
            ],
          },
          subscriptions: {
            created: [
              {
                id: "client-sub-333", // Temporary client ID
                projectId: "client-proj-111", // Reference to the offline created project!
                platformId: 10,
                planName: "Offline Plan",
                planType: "monthly",
                monthlyCost: 49.0,
              },
            ],
          },
        },
      });
      const res = makeMockResponse();

      await pushHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);

      // Verify ID Maps returned to client
      expect(res.jsonData.idMaps.projects).toHaveLength(1);
      const projMap = res.jsonData.idMaps.projects[0];
      expect(projMap.clientId).toBe("client-proj-111");
      const serverProjId = projMap.serverId;
      expect(typeof serverProjId).toBe("number");

      expect(res.jsonData.idMaps.expenses).toHaveLength(1);
      expect(res.jsonData.idMaps.expenses[0].clientId).toBe("client-exp-222");

      expect(res.jsonData.idMaps.subscriptions).toHaveLength(1);
      expect(res.jsonData.idMaps.subscriptions[0].clientId).toBe("client-sub-333");

      // Verify actual database insertions
      expect(mockDbState.projects).toHaveLength(1);
      expect(mockDbState.projects[0].id).toBe(serverProjId);
      expect(mockDbState.projects[0].name).toBe("Offline Project Alpha");
      expect(mockDbState.projects[0].workspaceId).toBe(1);

      expect(mockDbState.expenses).toHaveLength(1);
      expect(mockDbState.expenses[0].projectId).toBe(serverProjId); // Correctly resolved!
      expect(mockDbState.expenses[0].amount).toBe("85.5"); // Stringified in DB insertion
      expect(mockDbState.expenses[0].workspaceId).toBe(1);

      expect(mockDbState.subscriptions).toHaveLength(1);
      expect(mockDbState.subscriptions[0].projectId).toBe(serverProjId); // Correctly resolved!
      expect(mockDbState.subscriptions[0].monthlyCost).toBe("49");
      expect(mockDbState.subscriptions[0].workspaceId).toBe(1);
    });

    it("should abort push and fail if an entity references a project in another workspace (cross-tenant IDOR leak block)", async () => {
      // Seed a project belonging to workspace 999 (not the active workspace 1)
      mockDbState.projects = [
        {
          id: 777,
          workspaceId: 999,
          userId: "different_user",
          name: "Rogue Project",
          createdAt: new Date(),
        },
      ];

      const req = makeMockRequest("POST", "user_test_123", 1, {}, {
        changes: {
          expenses: {
            created: [
              {
                id: "client-exp-abc",
                projectId: 777, // Reference rogue project outside workspace bounds!
                amount: 10.0,
                currency: "USD",
                date: "2026-06-03",
              },
            ],
          },
        },
      });
      const res = makeMockResponse();

      await pushHandler(req, res);

      // Should fail with 500
      expect(res.statusCode).toBe(500);
      expect(res.jsonData.error).toContain("Project 777 not found in workspace");

      // Verify no expense was inserted
      expect(mockDbState.expenses).toHaveLength(0);
    });

    it("should successfully process offline updates and deletes", async () => {
      // Seed initial items
      mockDbState.projects = [
        { id: 501, workspaceId: 1, userId: "user_test_123", name: "Initial Project Name", createdAt: new Date() },
      ];
      mockDbState.expenses = [
        {
          id: 601,
          workspaceId: 1,
          userId: "user_test_123",
          amount: "100.00",
          currency: "USD",
          description: "Initial Expense",
          date: "2026-06-03",
          createdAt: new Date(),
        },
        {
          id: 602,
          workspaceId: 1,
          userId: "user_test_123",
          amount: "20.00",
          currency: "USD",
          description: "Item to be deleted",
          date: "2026-06-03",
          createdAt: new Date(),
        },
      ];

      const req = makeMockRequest("POST", "user_test_123", 1, {}, {
        changes: {
          projects: {
            updated: [
              { id: 501, name: "Updated Project Name" },
            ],
          },
          expenses: {
            updated: [
              { id: 601, amount: 250.5, description: "Updated Expense Description" },
            ],
            deleted: [602], // Delete item 602
          },
        },
      });
      const res = makeMockResponse();

      await pushHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);

      // Verify project was updated
      expect(mockDbState.projects[0].name).toBe("Updated Project Name");

      // Verify expense 601 was updated
      const exp601 = mockDbState.expenses.find((e) => e.id === 601);
      expect(exp601).toBeDefined();
      expect(exp601!.amount).toBe("250.5");
      expect(exp601!.description).toBe("Updated Expense Description");

      // Verify expense 602 was deleted
      const exp602 = mockDbState.expenses.find((e) => e.id === 602);
      expect(exp602).toBeUndefined();
    });
  });
});
