import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { requireAuth, isWorkspaceMember, authConfig } from "../auth";

const mockVerifyToken = vi.hoisted(() => vi.fn());
const mockDbSelect = vi.hoisted(() => vi.fn());

vi.mock("@workspace/db", () => ({
  db: {
    select: mockDbSelect,
  },
  workspaceMembersTable: {
    workspaceId: "workspaceId",
    userId: "userId",
    role: "role",
  },
}));

vi.mock("@clerk/clerk-sdk-node", () => ({
  verifyToken: mockVerifyToken,
}));

describe("Auth Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
      originalUrl: "/api/test",
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFn = vi.fn() as unknown as NextFunction;
    vi.clearAllMocks();
  });

  describe("requireAuth", () => {
    describe("webhook bypass", () => {
      it("should bypass auth for Stripe webhooks", async () => {
        req.originalUrl = "/api/webhooks/stripe";
        await requireAuth(req as Request, res as Response, nextFn);
        expect(nextFn).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should bypass auth for incoming provider webhooks", async () => {
        req.originalUrl = "/api/webhooks/incoming/openai";
        await requireAuth(req as Request, res as Response, nextFn);
        expect(nextFn).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should bypass auth for Clerk webhooks (signature-verified)", async () => {
        req.originalUrl = "/api/webhooks/clerk";
        await requireAuth(req as Request, res as Response, nextFn);
        expect(nextFn).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe("development bypass", () => {
      const originalEnv = process.env.NODE_ENV;

      beforeEach(() => {
        process.env.NODE_ENV = "development";
      });

      afterEach(() => {
        process.env.NODE_ENV = originalEnv;
      });

      it("should bypass auth with x-user-id header", async () => {
        req.headers = { "x-user-id": "user_123" };
        await requireAuth(req as Request, res as Response, nextFn);
        expect(req.userId).toBe("user_123");
        expect(nextFn).toHaveBeenCalled();
      });

      it("should bypass auth with simulatedUserId query param", async () => {
        req.query = { simulatedUserId: "user_456" };
        await requireAuth(req as Request, res as Response, nextFn);
        expect(req.userId).toBe("user_456");
        expect(nextFn).toHaveBeenCalled();
      });

      it("should reject request without token in production mode", async () => {
        process.env.NODE_ENV = "production";
        await requireAuth(req as Request, res as Response, nextFn);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: "Unauthorized",
          message: "Authentication token missing",
        });
      });
    });

    describe("token validation", () => {
      const originalEnv = process.env.NODE_ENV;

      beforeEach(() => {
        process.env.NODE_ENV = "production";
        process.env.CLERK_SECRET_KEY = "test_secret";
        process.env.CLERK_JWT_KEY = "test_jwt_key";
      });

      afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        delete process.env.CLERK_SECRET_KEY;
        delete process.env.CLERK_JWT_KEY;
      });

      it("should reject request without authorization header", async () => {
        await requireAuth(req as Request, res as Response, nextFn);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: "Unauthorized",
          message: "Authentication token missing",
        });
      });

      it("should reject request with invalid token", async () => {
        req.headers = { authorization: "Bearer invalid_token" };
        mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

        await requireAuth(req as Request, res as Response, nextFn);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: "Unauthorized",
          message: "Invalid or expired token",
          details: "Invalid token",
        });
      });

      it("should accept valid Bearer token and set userId", async () => {
        req.headers = { authorization: "Bearer valid_token" };
        mockVerifyToken.mockResolvedValue({ sub: "user_789" });

        await requireAuth(req as Request, res as Response, nextFn);

        expect(req.userId).toBe("user_789");
        expect(nextFn).toHaveBeenCalled();
      });

      it("should accept token from query parameter", async () => {
        req.query = { token: "query_token" };
        mockVerifyToken.mockResolvedValue({ sub: "user_query" });

        await requireAuth(req as Request, res as Response, nextFn);

        expect(req.userId).toBe("user_query");
        expect(nextFn).toHaveBeenCalled();
      });

      it("should set auth object on request when token is valid", async () => {
        req.headers = { authorization: "Bearer valid_token" };
        const decoded = { sub: "user_auth", email: "test@example.com" };
        mockVerifyToken.mockResolvedValue(decoded);

        await requireAuth(req as Request, res as Response, nextFn);

        expect(req.auth).toEqual(decoded);
      });
    });
  });

  describe("isWorkspaceMember", () => {
    it("should return true when user is a member", async () => {
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ role: "admin" }]),
        }),
      });

      const result = await isWorkspaceMember(1, "user-1");
      expect(result).toBe(true);
    });

    it("should return false when user is not a member", async () => {
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      });

      const result = await isWorkspaceMember(1, "user-999");
      expect(result).toBe(false);
    });

    it("should return false when user role does not match requirement", async () => {
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ role: "viewer" }]),
        }),
      });

      const result = await isWorkspaceMember(1, "user-1", ["owner", "admin"]);
      expect(result).toBe(false);
    });

    it("should return true when user role matches requirement", async () => {
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ role: "admin" }]),
        }),
      });

      const result = await isWorkspaceMember(1, "user-1", ["owner", "admin", "viewer"]);
      expect(result).toBe(true);
    });

    it("should return false on database error", async () => {
      mockDbSelect.mockImplementation(() => {
        throw new Error("DB error");
      });

      const result = await isWorkspaceMember(1, "user-1");
      expect(result).toBe(false);
    });
  });
});