import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { requireWorkspaceMember } from "../authz";

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

describe("Authorization Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    req = {
      userId: "user-1",
      params: {},
      body: {},
      query: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFn = vi.fn() as unknown as NextFunction;
    vi.clearAllMocks();
  });

  describe("requireWorkspaceMember", () => {
    it("should return 400 when userId is missing", async () => {
      req.userId = undefined;
      req.params = { workspaceId: "1" };
      
      const middleware = requireWorkspaceMember();
      await middleware(req as Request, res as Response, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid workspace context or session",
      });
    });

    it("should return 400 when workspaceId is invalid", async () => {
      req.params = {};
      
      const middleware = requireWorkspaceMember();
      await middleware(req as Request, res as Response, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid workspace context or session",
      });
    });

    it("should return 400 when workspaceId is not a number", async () => {
      req.params = { workspaceId: "invalid" };
      
      const middleware = requireWorkspaceMember();
      await middleware(req as Request, res as Response, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 403 when user is not a member of workspace", async () => {
      req.params = { workspaceId: "1" };
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      });

      const middleware = requireWorkspaceMember();
      await middleware(req as Request, res as Response, nextFn);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Forbidden: You are not a member of this workspace",
      });
    });

    it("should return 403 when user role does not meet requirement", async () => {
      req.params = { workspaceId: "1" };
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ role: "viewer" }]),
        }),
      });

      const middleware = requireWorkspaceMember(["owner", "admin"]);
      await middleware(req as Request, res as Response, nextFn);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Forbidden: Insufficient workspace role",
      });
    });

    it("should call next when user is owner", async () => {
      req.params = { workspaceId: "1" };
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ role: "owner" }]),
        }),
      });

      const middleware = requireWorkspaceMember(["owner", "admin"]);
      await middleware(req as Request, res as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(req.workspaceRole).toBe("owner");
    });

    it("should call next when user is admin", async () => {
      req.params = { workspaceId: "1" };
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ role: "admin" }]),
        }),
      });

      const middleware = requireWorkspaceMember(["owner", "admin"]);
      await middleware(req as Request, res as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(req.workspaceRole).toBe("admin");
    });

    it("should call next without role requirement when user is a member", async () => {
      req.params = { workspaceId: "1" };
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ role: "viewer" }]),
        }),
      });

      const middleware = requireWorkspaceMember();
      await middleware(req as Request, res as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(req.workspaceRole).toBe("viewer");
    });

    it("should resolve workspaceId from req.body", async () => {
      req.params = {};
      req.body = { workspaceId: 42 };
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ role: "admin" }]),
        }),
      });

      const middleware = requireWorkspaceMember();
      await middleware(req as Request, res as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it("should resolve workspaceId from req.query", async () => {
      req.params = {};
      req.query = { workspaceId: "99" };
      mockDbSelect.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ role: "owner" }]),
        }),
      });

      const middleware = requireWorkspaceMember();
      await middleware(req as Request, res as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it("should return 500 on database error", async () => {
      req.params = { workspaceId: "1" };
      mockDbSelect.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const middleware = requireWorkspaceMember();
      await middleware(req as Request, res as Response, nextFn);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
        message: "Failed to verify workspace membership",
      });
    });
  });
});