import { describe, it, expect, beforeEach, vi } from "vitest";

const mockDbExecute = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("@workspace/db", () => ({
  db: { execute: mockDbExecute },
}));

import healthRouter from "../health";

const makeMockRequest = () => ({});

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

describe("Health Endpoint", () => {
  let healthzHandler: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const layer = healthRouter.stack.find(
      (l: any) => l.route && l.route.path === "/healthz"
    );
    healthzHandler = layer?.route?.stack?.[0]?.handle;
  });

  it("should return 200 with status ok when DB is connected", async () => {
    mockDbExecute.mockResolvedValue(undefined);
    const req = makeMockRequest();
    const res = makeMockResponse();
    await healthzHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ status: "ok", db: "connected" });
  });

  it("should return 503 with status error when DB is disconnected", async () => {
    mockDbExecute.mockRejectedValue(new Error("connection refused"));
    const req = makeMockRequest();
    const res = makeMockResponse();
    await healthzHandler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.jsonData).toEqual({ status: "error", db: "disconnected" });
  });

  it("should return proper JSON structure on success", async () => {
    mockDbExecute.mockResolvedValue(undefined);
    const req = makeMockRequest();
    const res = makeMockResponse();
    await healthzHandler(req, res);
    expect(res.jsonData).toHaveProperty("status");
    expect(res.jsonData).toHaveProperty("db");
    expect(typeof res.jsonData.status).toBe("string");
    expect(typeof res.jsonData.db).toBe("string");
  });

  it("should return proper JSON structure on failure", async () => {
    mockDbExecute.mockRejectedValue(new Error("timeout"));
    const req = makeMockRequest();
    const res = makeMockResponse();
    await healthzHandler(req, res);
    expect(res.jsonData).toHaveProperty("status");
    expect(res.jsonData).toHaveProperty("db");
    expect(res.jsonData.status).toBe("error");
    expect(res.jsonData.db).toBe("disconnected");
  });
});
