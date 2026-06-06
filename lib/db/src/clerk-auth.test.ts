import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the DATABASE_URL to avoid database connection errors on initialization
process.env.DATABASE_URL = "postgresql://mock_user:mock_password@localhost:5432/mock_db";

import { requireAuth, authConfig } from "../../../artifacts/api-server/src/middlewares/auth";

const makeMockRequest = (headers: Record<string, string> = {}, originalUrl = "/api/projects") => {
  return {
    headers,
    originalUrl,
    query: {},
    userId: undefined,
    auth: undefined,
  } as any;
};

const makeMockResponse = () => {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((data: any) => {
    res.jsonData = data;
    return res;
  });
  return res;
};

describe("Clerk Authentication Middleware", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("should bypass authentication for external stripe webhook", async () => {
    const req = makeMockRequest({}, "/api/webhooks/stripe");
    const res = makeMockResponse();
    const next = vi.fn();
    const verifySpy = vi.spyOn(authConfig, "verifyToken");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(verifySpy).not.toHaveBeenCalled();
  });

  it("should bypass authentication for external incoming webhook", async () => {
    const req = makeMockRequest({}, "/api/webhooks/incoming");
    const res = makeMockResponse();
    const next = vi.fn();
    const verifySpy = vi.spyOn(authConfig, "verifyToken");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(verifySpy).not.toHaveBeenCalled();
  });

  it("should bypass verification in development via x-user-id header", async () => {
    process.env.NODE_ENV = "development";
    const req = makeMockRequest({ "x-user-id": "simulated_user_999" });
    const res = makeMockResponse();
    const next = vi.fn();
    const verifySpy = vi.spyOn(authConfig, "verifyToken");

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe("simulated_user_999");
    expect(res.status).not.toHaveBeenCalled();
    expect(verifySpy).not.toHaveBeenCalled();
  });

  it("should NOT bypass verification in production even if x-user-id header is provided", async () => {
    process.env.NODE_ENV = "production";
    const req = makeMockRequest({ "x-user-id": "simulated_user_999" });
    const res = makeMockResponse();
    const next = vi.fn();
    const verifySpy = vi.spyOn(authConfig, "verifyToken");

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(req.userId).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.jsonData.error).toBe("Unauthorized");
    expect(res.jsonData.message).toBe("Authentication token missing");
    expect(verifySpy).not.toHaveBeenCalled();
  });

  it("should return 401 when authorization header is missing", async () => {
    const req = makeMockRequest({});
    const res = makeMockResponse();
    const next = vi.fn();
    const verifySpy = vi.spyOn(authConfig, "verifyToken");

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.jsonData.error).toBe("Unauthorized");
    expect(res.jsonData.message).toBe("Authentication token missing");
    expect(verifySpy).not.toHaveBeenCalled();
  });

  it("should return 401 when token is invalid or expired", async () => {
    const req = makeMockRequest({ authorization: "Bearer invalid_expired_token_123" });
    const res = makeMockResponse();
    const next = vi.fn();
    const verifySpy = vi.spyOn(authConfig, "verifyToken").mockRejectedValueOnce(new Error("JWT expired"));

    await requireAuth(req, res, next);

    expect(verifySpy).toHaveBeenCalledWith("invalid_expired_token_123", {
      secretKey: process.env.CLERK_SECRET_KEY,
      jwtKey: process.env.CLERK_JWT_KEY,
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.jsonData.error).toBe("Unauthorized");
    expect(res.jsonData.message).toBe("Invalid or expired token");
    expect(res.jsonData.details).toBe("JWT expired");
  });

  it("should authenticate successfully with a valid token", async () => {
    const req = makeMockRequest({ authorization: "Bearer valid_token_foo" });
    const res = makeMockResponse();
    const next = vi.fn();

    const mockDecodedToken = {
      sub: "user_clerk_123456",
      iss: "https://clerk.example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const verifySpy = vi.spyOn(authConfig, "verifyToken").mockResolvedValueOnce(mockDecodedToken as any);

    await requireAuth(req, res, next);

    expect(verifySpy).toHaveBeenCalledWith("valid_token_foo", {
      secretKey: process.env.CLERK_SECRET_KEY,
      jwtKey: process.env.CLERK_JWT_KEY,
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe("user_clerk_123456");
    expect(req.auth).toEqual(mockDecodedToken);
    expect(res.status).not.toHaveBeenCalled();
  });
});
