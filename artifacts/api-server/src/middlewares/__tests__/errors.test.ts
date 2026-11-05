import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/sentry", () => ({ captureError: () => {} }));
import { errorHandler } from "../errors";

function respond(err: any) {
  const res: any = { statusCode: 0, body: undefined };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (body: unknown) => { res.body = body; return res; };
  errorHandler(err, { method: "GET", originalUrl: "/api/x" } as any, res, () => {});
  return res;
}

describe("error responses", () => {
  const original = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = original; });

  it.each([500, 502, 503])("hides %i details in production", (statusCode) => {
    process.env.NODE_ENV = "production";
    const res = respond(Object.assign(new Error('Failed query: select * from "secret_table" params: 42'), { statusCode }));
    expect(res.statusCode).toBe(statusCode);
    expect(JSON.stringify(res.body)).not.toContain("secret_table");
  });

  it("maps CORS rejections to 403 instead of 500", () => {
    process.env.NODE_ENV = "production";
    const res = respond(new Error("CORS: origin 'https://evil.example' not allowed"));
    expect(res.statusCode).toBe(403);
  });
});
