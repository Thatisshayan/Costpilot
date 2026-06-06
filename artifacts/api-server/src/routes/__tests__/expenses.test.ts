import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockDbState, mockCreateExpenseBody, mockUpdateExpenseBody, mockGetExpenseParams, mockUpdateExpenseParams, mockDeleteExpenseParams } = vi.hoisted(() => {
  const state: any = {
    selectResult: Promise.resolve([]),
    insertResult: Promise.resolve([]),
    updateResult: Promise.resolve([]),
  };

  const createParse = (input: any) => {
    if (!input || typeof input !== "object") throw Object.assign(new Error("Invalid input"), { name: "ZodError" });
    if (typeof input.amount !== "number") throw Object.assign(new Error("amount required"), { name: "ZodError" });
    if (typeof input.date !== "string") throw Object.assign(new Error("date required"), { name: "ZodError" });
    return input;
  };

  return {
    mockDbState: state,
    mockCreateExpenseBody: { parse: createParse },
    mockUpdateExpenseBody: { parse: (input: any) => input || {} },
    mockGetExpenseParams: { parse: (input: any) => input },
    mockUpdateExpenseParams: { parse: (input: any) => input },
    mockDeleteExpenseParams: { parse: (input: any) => input },
  };
});

function thenable(result: any) {
  return {
    then: (resolve: any) => Promise.resolve(result).then(resolve),
    catch: () => {},
  };
}

vi.mock("@workspace/db", () => ({
  db: {
    execute: () => Promise.resolve(),
    select: () => {
      const chain: any = {};
      chain.from = () => chain;
      chain.leftJoin = () => chain;
      chain.where = () => chain;
      chain.orderBy = () => chain;
      chain.then = (resolve: any) => Promise.resolve(mockDbState.selectResult).then(resolve);
      chain.catch = () => {};
      return chain;
    },
    insert: () => ({
      values: () => ({
        returning: () => thenable(mockDbState.insertResult),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => thenable(mockDbState.updateResult),
        }),
      }),
    }),
    delete: () => ({ where: () => Promise.resolve() }),
  },
  expensesTable: {},
  platformsTable: {},
  projectsTable: {},
}));

vi.mock("@workspace/api-zod", () => ({
  CreateExpenseBody: mockCreateExpenseBody,
  UpdateExpenseBody: mockUpdateExpenseBody,
  GetExpenseParams: mockGetExpenseParams,
  UpdateExpenseParams: mockUpdateExpenseParams,
  DeleteExpenseParams: mockDeleteExpenseParams,
}));

import expensesRouter from "../expenses";

const makeMockRequest = (body: any = {}, params: any = {}, userId = "user-1") => ({
  userId,
  body,
  params,
  query: {},
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
  res.send = () => res;
  return res;
};

function getHandler(path: string, method: string): Function {
  for (const layer of expensesRouter.stack) {
    if (layer.route) {
      const route = layer.route as any;
      const routeMethods = route.methods || {};
      const methods = Array.isArray(routeMethods) ? routeMethods : Object.keys(routeMethods).filter((k) => routeMethods[k]);
      if (route.path === path && methods.some((m: string) => m.toLowerCase() === method.toLowerCase())) {
        return route.stack[0].handle as Function;
      }
    }
  }
  throw new Error(`Handler not found for ${method} ${path}`);
}

describe("Expenses API", () => {
  beforeEach(() => {
    mockDbState.selectResult = Promise.resolve([]);
    mockDbState.insertResult = Promise.resolve([]);
    mockDbState.updateResult = Promise.resolve([]);
  });

  describe("GET /", () => {
    it("should return an array of expenses", async () => {
      const handler = getHandler("/", "get");
      expect(handler).toBeDefined();

      const now = new Date();
      mockDbState.selectResult = Promise.resolve([
        { id: 1, platformId: 1, platformName: "OpenAI", projectId: null, projectName: null, amount: "42.50", currency: "USD", description: "GPT-4 usage", category: "API Usage", date: "2025-01-15", createdAt: now },
      ]);

      const req = makeMockRequest();
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.jsonData)).toBe(true);
      expect(res.jsonData).toHaveLength(1);
      expect(res.jsonData[0].amount).toBe(42.5);
    });

    it("should return empty array when no expenses", async () => {
      const handler = getHandler("/", "get");
      mockDbState.selectResult = Promise.resolve([]);
      const req = makeMockRequest();
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.jsonData)).toBe(true);
      expect(res.jsonData).toHaveLength(0);
    });
  });

  describe("POST /", () => {
    it("should create an expense with valid data", async () => {
      const handler = getHandler("/", "post");
      expect(handler).toBeDefined();

      const now = new Date();
      const inserted = { id: 1, platformId: 1, projectId: null, amount: "99.99", currency: "USD", description: "Test", category: "API Usage", date: "2025-02-01", userId: "user-1", createdAt: now };
      mockDbState.insertResult = Promise.resolve([inserted]);
      mockDbState.selectResult = Promise.resolve([{ name: "OpenAI" }]);

      const req = makeMockRequest({ platformId: 1, amount: 99.99, currency: "USD", description: "Test", category: "API Usage", date: "2025-02-01" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.jsonData).toHaveProperty("id");
      expect(res.jsonData.amount).toBe(99.99);
    });

    it("should reject invalid data with missing amount", async () => {
      const handler = getHandler("/", "post");
      const req = makeMockRequest({ date: "2025-02-01" });
      const res = makeMockResponse();
      await expect(handler(req, res)).rejects.toThrow();
    });

    it("should reject invalid data with missing date", async () => {
      const handler = getHandler("/", "post");
      const req = makeMockRequest({ amount: 50 });
      const res = makeMockResponse();
      await expect(handler(req, res)).rejects.toThrow();
    });
  });

  describe("GET /:id", () => {
    it("should return an expense by id", async () => {
      const handler = getHandler("/:id", "get");
      expect(handler).toBeDefined();

      const now = new Date();
      mockDbState.selectResult = Promise.resolve([
        { id: 5, platformId: null, platformName: null, projectId: null, projectName: null, amount: "25.00", currency: "USD", description: "Single expense", category: "Compute", date: "2025-03-01", createdAt: now },
      ]);

      const req = makeMockRequest({}, { id: "5" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.id).toBe(5);
    });

    it("should return 404 for non-existent expense", async () => {
      const handler = getHandler("/:id", "get");
      mockDbState.selectResult = Promise.resolve([]);
      const req = makeMockRequest({}, { id: "999" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.jsonData.error).toBe("Not found");
    });
  });

  describe("PATCH /:id", () => {
    it("should update an existing expense", async () => {
      const handler = getHandler("/:id", "patch");
      expect(handler).toBeDefined();

      const now = new Date();
      const updated = { id: 1, platformId: null, projectId: null, amount: "150.00", currency: "USD", description: "Updated", category: "Storage", date: "2025-03-15", userId: "user-1", createdAt: now };
      mockDbState.updateResult = Promise.resolve([updated]);
      mockDbState.selectResult = Promise.resolve([]);

      const req = makeMockRequest({ amount: 150, description: "Updated" }, { id: "1" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.amount).toBe(150);
    });

    it("should return 404 when updating non-existent expense", async () => {
      const handler = getHandler("/:id", "patch");
      mockDbState.updateResult = Promise.resolve([]);
      const req = makeMockRequest({ description: "nope" }, { id: "999" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.jsonData.error).toBe("Not found");
    });
  });

  describe("DELETE /:id", () => {
    it("should delete an expense and return 204", async () => {
      const handler = getHandler("/:id", "delete");
      expect(handler).toBeDefined();
      const req = makeMockRequest({}, { id: "1" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(204);
    });
  });

  describe("POST /import-batch", () => {
    it("should import a batch of transactions", async () => {
      const handler = getHandler("/import-batch", "post");
      expect(handler).toBeDefined();

      const now = new Date();
      const inserted = [
        { id: 1, amount: "10.00", createdAt: now },
        { id: 2, amount: "20.00", createdAt: now },
      ];
      mockDbState.insertResult = Promise.resolve(inserted);

      const req = makeMockRequest({
        transactions: [
          { amount: 10, date: "2025-04-01", description: "txn1" },
          { amount: 20, date: "2025-04-02", description: "txn2" },
        ],
      });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.jsonData.count).toBe(2);
    });

    it("should reject empty transactions array", async () => {
      const handler = getHandler("/import-batch", "post");
      const req = makeMockRequest({ transactions: [] });
      const res = makeMockResponse();
      await expect(handler(req, res)).rejects.toThrow();
    });
  });
});
