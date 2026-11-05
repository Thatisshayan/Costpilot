import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { launchScope } from "../launch-scope";

describe("launch API surface", () => {
  for (const path of ["/expenses", "/expenses/1", "/projects", "/platforms/2", "/workspaces/accept-invite", "/healthz", "/webhooks/clerk"]) {
    it(`allows the reviewed core path ${path}`, () => {
      const next = vi.fn();
      launchScope({ path } as Request, {} as Response, next as NextFunction);
      expect(next).toHaveBeenCalledOnce();
    });
  }
  for (const path of ["/remediation/execute", "/telemetry/chat/completions", "/platforms/1/sync", "/webhooks/stripe", "/subscriptions", "/credits"]) {
    it(`fails closed for preview path ${path}`, () => {
      const next = vi.fn();
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      launchScope({ path } as Request, res as unknown as Response, next as NextFunction);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(next).not.toHaveBeenCalled();
    });
  }
});
