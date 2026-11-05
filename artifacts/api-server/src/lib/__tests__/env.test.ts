import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const BASE = {
  DATABASE_URL: "postgresql://localhost:5432/costpilot_test",
  CLERK_SECRET_KEY: "sk_test_fixture",
  KMS_MASTER_KEY: "a".repeat(64),
};

describe("validateEnv test identity guard", () => {
  const saved = { ...process.env };
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { process.env = { ...saved }; });

  async function validate(extra: Record<string, string>) {
    process.env = { ...BASE, ...extra } as NodeJS.ProcessEnv;
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => { throw new Error(`exit ${code}`); }) as never);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { validateEnv } = await import("../env");
      return validateEnv();
    } finally { exit.mockRestore(); log.mockRestore(); }
  }

  it("allows the bypass on an explicit test runtime", async () => {
    await expect(validate({ NODE_ENV: "test", AUTH_TEST_BYPASS: "1" })).resolves.toMatchObject({ AUTH_TEST_BYPASS: "1" });
  });

  it("refuses to start with the bypass in production", async () => {
    await expect(validate({ NODE_ENV: "production", AUTH_TEST_BYPASS: "1", ALLOWED_ORIGINS: "https://app.example", CLERK_WEBHOOK_SIGNING_SECRET: "whsec_x" })).rejects.toThrow();
  });

  it("refuses to start with the bypass and a live Clerk key", async () => {
    await expect(validate({ NODE_ENV: "development", AUTH_TEST_BYPASS: "1", CLERK_SECRET_KEY: "sk_live_fixture" })).rejects.toThrow();
  });
});
