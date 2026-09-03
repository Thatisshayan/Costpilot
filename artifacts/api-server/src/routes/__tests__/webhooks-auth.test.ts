import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "node:crypto";

const mockDbExecute = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("@workspace/db", () => ({
  db: { execute: mockDbExecute },
  workspaceMembersTable: {},
  workspacesTable: {},
}));

import { requireAuth } from "../../middlewares/auth";
import { verifyClerkSignature } from "../webhooks";

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
  const testSecretBase64 = Buffer.from("test_secret_key_12345").toString("base64");
  const testSecret = "whsec_" + testSecretBase64;
  const testRawBody = JSON.stringify({ type: "user.created", data: { id: "user_123" } });

  function generateSignature(svixId: string, timestamp: string, body: string, secret: string): string {
    const signedContent = `${svixId}.${timestamp}.${body}`;
    const secretKey = secret.startsWith("whsec_") ? secret.substring(6) : secret;
    const hmac = crypto.createHmac("sha256", Buffer.from(secretKey, "base64"));
    hmac.update(signedContent);
    return `v1,${hmac.digest("base64")}`;
  }

  it("should return true for valid signature", () => {
    const svixId = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(svixId, timestamp, testRawBody, testSecret);
    const headers = {
      "svix-id": svixId,
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
    const svixId = "msg_123";
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
    const signature = generateSignature(svixId, oldTimestamp, testRawBody, testSecret);
    const headers = {
      "svix-id": svixId,
      "svix-timestamp": oldTimestamp,
      "svix-signature": signature,
    };
    const result = verifyClerkSignature(testRawBody, headers, testSecret);
    expect(result).toBe(false);
  });

  it("should return false for tampered body", () => {
    const svixId = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(svixId, timestamp, testRawBody, testSecret);
    const headers = {
      "svix-id": svixId,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    };
    const tamperedBody = testRawBody.replace("user_123", "user_456");
    const result = verifyClerkSignature(tamperedBody, headers, testSecret);
    expect(result).toBe(false);
  });

  it("should handle whsec_ prefix in secret", () => {
    const svixId = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(svixId, timestamp, testRawBody, testSecret);
    const headers = {
      "svix-id": svixId,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    };
    const result = verifyClerkSignature(testRawBody, headers, testSecret);
    expect(result).toBe(true);
  });
});
