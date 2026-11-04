import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { csrfProtection } from "../csrf";

describe("CSRF credential transport", () => {
  function request(authorization?: string, cookie?: string, header?: string) {
    const req = {
      method: "POST", originalUrl: "/api/expenses",
      headers: { authorization, "x-csrf-token": header },
      cookies: { "csrf-token": cookie },
    } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    csrfProtection(req, res as unknown as Response, next as NextFunction);
    return { res, next };
  }

  it("lets a mobile/cross-origin bearer write reach token verification without cookies", () => {
    expect(request("Bearer session-token").next).toHaveBeenCalledOnce();
  });
  it("rejects a write with no explicit bearer or CSRF credentials", () => {
    expect(request().res.status).toHaveBeenCalledWith(403);
  });
  it("does not exempt an empty bearer header", () => {
    expect(request("Bearer ").res.status).toHaveBeenCalledWith(403);
  });
  it("rejects mismatched CSRF credentials", () => {
    expect(request(undefined, "cookie", "other").res.status).toHaveBeenCalledWith(403);
  });
  it("preserves cookie-based requests with matching CSRF credentials", () => {
    expect(request(undefined, "matching", "matching").next).toHaveBeenCalledOnce();
  });
});
