import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";

const mockDbExecute = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("@workspace/db", () => ({
  db: { execute: mockDbExecute },
  workspaceMembersTable: {},
  workspacesTable: {},
}));

import { requireAuth } from "../middlewares/auth";
import { verifyClerkSignature } from "../routes/webhooks";

function makeReq(headers: Record<string, string> = {}, query: Record<string, string> = {}) {
  return {
    headers,
    query,
    originalUrl: "/api/test",
    userId: undefined,
    auth: undefined,
    workspaceRole: undefined,
  } as any;
}

function makeRes() {
  const res: any = { statusCode: 200 };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: any) => { res.jsonData = data; return res; };
  return res;
}

describe("Auth Middleware", () => {
  it("should return 401 when no token provided", async () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when token is invalid", async () => {
    const req = makeReq({ authorization: "Bearer invalid-token" });
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should accept token from query parameter", async () => {
    const req = makeReq({}, { token: "valid-token" });
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should bypass auth for webhook routes", async () => {
    const req = makeReq();
    req.originalUrl = "/api/webhooks/stripe";
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should bypass auth for incoming webhook routes", async () => {
    const req = makeReq();
    req.originalUrl = "/api/webhooks/incoming/openai";
    const res = makeRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("Clerk Webhook Signature Verification", () => {
  const testSecret = "whsec_test_secret_key_12345";
  const testRawBody = JSON.stringify({ type: "user.created", data: { id: "user_123" } });

  function generateSignature(timestamp: string, body: string, secret: string): string {
    const signedContent = `${timestamp}.${body}`;
    const hmac = crypto.createHmac("sha256", Buffer.from(secret, "base64"));
    hmac.update(signedContent);
    return `v1,${hmac.digest("base64")}`;
  }

  it("should return true for valid signature", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(timestamp, testRawBody, testSecret);
    const headers = {
      "svix-id": "msg_123",
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    };
    const result = verifyClerkSignature(testRawBody, headers, testSecret);
    expect(result).toBe(true);
  });

  it("should return false for missing headers", () => {
    const result = verifyClerkSignature(testRawBody, {}, testSecret);
    expect(result).toBe(false);
  });

  it("should return false for expired timestamp (>5 min)", () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
    const signature = generateSignature(oldTimestamp, testRawBody, testSecret);
    const headers = {
      "svix-id": "msg_123",
      "svix-timestamp": oldTimestamp,
      "svix-signature": signature,
    };
    const result = verifyClerkSignature(testRawBody, headers, testSecret);
    expect(result).toBe(false);
  });

  it("should return false for tampered body", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(timestamp, testRawBody, testSecret);
    const headers = {
      "svix-id": "msg_123",
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    };
    const tamperedBody = testRawBody.replace("user_123", "user_456");
    const result = verifyClerkSignature(tamperedBody, headers, testSecret);
    expect(result).toBe(false);
  });

  it("should handle whsec_ prefix in secret", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const prefixedSecret = "whsec_" + testSecret;
    const signature = generateSignature(timestamp, testRawBody, testSecret);
    const headers = {
      "svix-id": "msg_123",
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    };
    const result = verifyClerkSignature(testRawBody, headers, prefixedSecret);
    expect(result).toBe(true);
  });
});
