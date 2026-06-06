import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock DATABASE_URL so that the db client initialization does not crash
process.env.DATABASE_URL = "postgresql://mock_user:mock_password@localhost:5432/mock_db";

import { db, expensesTable, deploymentPoliciesTable } from "./index";
import telemetryRouter from "../../../artifacts/api-server/src/routes/telemetry";

// Introspect the Express router to find our handlers
const llmRouteLayer = telemetryRouter.stack.find(
  (layer: any) => layer.route && layer.route.path === "/llm-route"
);
const llmRouteHandler = llmRouteLayer?.route.stack[0].handle;

const completionsLayer = telemetryRouter.stack.find(
  (layer: any) => layer.route && Array.isArray(layer.route.path) 
    ? layer.route.path.includes("/chat/completions") 
    : layer.route.path === "/chat/completions" || layer.route.path === "/v1/chat/completions"
);
const completionsHandler = completionsLayer?.route.stack[0].handle;

// Setup mock helper for express Request / Response
const makeMockRequest = (body: any, headers: Record<string, string> = {}) => ({
  userId: "user_test_123",
  body,
  query: {},
  headers: {
    "x-user-id": "user_test_123",
    ...headers
  }
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

describe("LLM Telemetry Proxy Router & Compliance Guardrails", () => {
  let mockSelectData: any[] = [];
  let mockInsertedValues: any[] = [];

  beforeEach(() => {
    mockSelectData = [];
    mockInsertedValues = [];
    vi.restoreAllMocks();

    // Mock db.select fluent interface
    vi.spyOn(db, "select").mockImplementation((...selectArgs: any[]) => {
      return {
        from: (table: any) => {
          return {
            leftJoin: () => this,
            innerJoin: () => this,
            where: (whereClause: any) => {
              return {
                limit: () => {
                  return {
                    then: (resolve: any) => {
                      // Handlers expecting array returning
                      if (table === deploymentPoliciesTable) {
                        // Return the policies
                        return resolve(mockSelectData.filter(d => d.threshold !== undefined));
                      }
                      // For current month spend summation
                      return resolve(mockSelectData.filter(d => d.total !== undefined));
                    }
                  };
                },
                then: (resolve: any) => {
                  if (table === deploymentPoliciesTable) {
                    return resolve(mockSelectData.filter(d => d.threshold !== undefined));
                  }
                  return resolve(mockSelectData.filter(d => d.total !== undefined));
                }
              };
            },
            then: (resolve: any) => {
              return resolve(mockSelectData);
            }
          };
        }
      } as any;
    });

    // Mock db.insert fluent interface
    vi.spyOn(db, "insert").mockImplementation((table: any) => {
      return {
        values: (vals: any) => {
          mockInsertedValues.push(vals);
          return {
            returning: () => {
              return [{ id: 101, ...vals, createdAt: new Date() }];
            }
          };
        }
      } as any;
    });
  });

  describe("Introspection check", () => {
    it("should successfully extract router handlers", () => {
      expect(llmRouteHandler).toBeDefined();
      expect(completionsHandler).toBeDefined();
    });
  });

  describe("Unified Endpoint: /llm-route", () => {
    it("should ALLOW request if under-budget and write to database", async () => {
      // 1. Setup mock data: current spend is $45, limit is $500
      mockSelectData = [
        { total: "45.00" }, // Mock current month's accumulated spend
        { id: 1, ruleType: "budget_threshold", threshold: "500.00", action: "block", isActive: true } // policy limit
      ];

      const req = makeMockRequest({
        model: "gpt-4o",
        provider: "openai",
        tokens: { prompt: 2000, completion: 500 },
        latency: 150,
        workspaceId: 1
      });
      const res = makeMockResponse();

      await llmRouteHandler(req, res);

      // Verify that it allowed and returned successful JSON
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.choices[0].message.content).toContain("fully compliant");

      // Verify telemetry database write occurred
      expect(mockInsertedValues.length).toBe(1);
      const expense = mockInsertedValues[0];
      expect(expense.workspaceId).toBe(1);
      expect(expense.category).toBe("API Usage");
      // Cost calculation for 2000 prompt + 500 completion tokens of gpt-4o:
      // (2000/1000 * 0.005) + (500/1000 * 0.015) = 0.01 + 0.0075 = 0.0175
      expect(Number(expense.amount)).toBeCloseTo(0.0175);
    });

    it("should BLOCK request if over-budget and return 402", async () => {
      // 1. Setup mock data: current spend is $510, limit is $500
      mockSelectData = [
        { total: "510.00" }, // Mock current monthly spend
        { id: 1, ruleType: "budget_threshold", threshold: "500.00", action: "block", isActive: true } // policy limit
      ];

      const req = makeMockRequest({
        model: "gpt-4o",
        provider: "openai",
        tokens: 1000,
        workspaceId: 1
      });
      const res = makeMockResponse();

      await llmRouteHandler(req, res);

      // Verify blocked request has status code 402
      expect(res.statusCode).toBe(402);
      expect(res.jsonData.error).toBe("PaymentRequired");
      expect(res.jsonData.message).toContain("blocked this downstream LLM request");

      // Verify no telemetry was written to expensesTable
      expect(mockInsertedValues.length).toBe(0);
    });
  });

  describe("OpenAI ChatCompletion Endpoint: /v1/chat/completions", () => {
    it("should ALLOW request if under-budget and write telemetry", async () => {
      mockSelectData = [
        { total: "20.00" }, // Mock spend
        { id: 1, ruleType: "budget_threshold", threshold: "100.00", action: "block", isActive: true } // policy limit
      ];

      const req = makeMockRequest({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "user", content: "Write a short poem" }
        ],
        max_tokens: 100,
        workspaceId: 1
      });
      const res = makeMockResponse();

      await completionsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.object).toBe("chat.completion");
      expect(res.jsonData.choices[0].message.content).toContain("compliance");

      // Verify database write
      expect(mockInsertedValues.length).toBe(1);
      const expense = mockInsertedValues[0];
      expect(expense.category).toBe("API Usage");
      expect(expense.tags).toContain("gpt-3.5-turbo");
    });

    it("should BLOCK request if over-budget and return 402", async () => {
      mockSelectData = [
        { total: "105.00" }, // Mock spend already above limit
        { id: 1, ruleType: "budget_threshold", threshold: "100.00", action: "block", isActive: true } // policy limit
      ];

      const req = makeMockRequest({
        model: "gpt-4",
        messages: [
          { role: "user", content: "Hello" }
        ],
        workspaceId: 1
      });
      const res = makeMockResponse();

      await completionsHandler(req, res);

      expect(res.statusCode).toBe(402);
      expect(res.jsonData.error).toBe("PaymentRequired");
      expect(res.jsonData.message).toContain("blocked");
      expect(mockInsertedValues.length).toBe(0);
    });
  });
});
