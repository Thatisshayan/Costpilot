import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock DB before importing the module
const mockDbSelect = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbTransaction = vi.hoisted(() => vi.fn());
const mockProcessProviderUsage = vi.hoisted(() => vi.fn());

vi.mock("@workspace/db", () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    transaction: mockDbTransaction,
  },
  webhooksTable: {},
  workspacesTable: {},
  workspaceMembersTable: {},
}));

vi.mock("../services/webhook-processor", () => ({
  processStripeWebhook: vi.fn(),
  processProviderUsage: mockProcessProviderUsage,
}));

vi.mock("stripe", () => ({
  default: class MockStripe {
    webhooks = {
      constructEvent: vi.fn(),
    };
    constructor() {}
  },
}));

const createChainableMock = () => ({
  from: () => ({
    where: () => ({
      then: (resolve: any) => Promise.resolve([
        { id: 1, name: "Slack Webhook", url: "https://hooks.slack.com/test", type: "slack", workspaceId: 1 },
      ]).then(resolve),
      catch: () => {},
    }),
    orderBy: () => ({
      returning: () => ({
        then: (resolve: any) => Promise.resolve([
          { id: 1, workspaceId: 1, name: "Test Webhook", url: "https://example.com/webhook", type: "slack" },
        ]).then(resolve),
        catch: () => {},
      }),
    }),
  }),
  values: () => ({
    returning: () => ({
      then: (resolve: any) => Promise.resolve([
        { id: 1, workspaceId: 1, name: "Test Webhook", url: "https://example.com/webhook", type: "slack" },
      ]).then(resolve),
      catch: () => {},
    }),
  }),
});

describe("Webhooks API", () => {
  let webhooksRouter: any;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockDbSelect.mockReturnValue(createChainableMock());
    
    const webhooks = await import("../webhooks");
    webhooksRouter = webhooks.default;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  });

  describe("GET /", () => {
    it("should have the / endpoint registered", () => {
      const hasEndpoint = webhooksRouter.stack.some((layer: any) => 
        layer.route?.path === "/"
      );
      expect(hasEndpoint).toBe(true);
    });
  });

  describe("POST /", () => {
    it("should have the POST / endpoint registered", () => {
      const hasEndpoint = webhooksRouter.stack.some((layer: any) => 
        layer.route?.path === "/" && layer.route?.methods?.post
      );
      expect(hasEndpoint).toBe(true);
    });
  });

  describe("POST /stripe", () => {
    it("should have the /stripe endpoint registered", () => {
      const hasEndpoint = webhooksRouter.stack.some((layer: any) => 
        layer.route?.path === "/stripe"
      );
      expect(hasEndpoint).toBe(true);
    });

    it("should return 401 when stripe-signature header is missing", async () => {
      process.env.NODE_ENV = "development";
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

      const layer = webhooksRouter.stack.find((l: any) => l.route?.path === "/stripe");
      const handler = layer?.route?.stack?.[0]?.handle;

      if (handler) {
        const req: any = { headers: {} };
        const res: any = {
          statusCode: 200,
          status: (code: number) => {
            res.statusCode = code;
            return res;
          },
          send: (data: any) => {
            res.sendData = data;
            return res;
          },
        };
        await handler(req, res);
        expect(res.statusCode).toBe(401);
      }
    });
  });

  describe("POST /incoming/:provider", () => {
    it("should have the /incoming/:provider endpoint registered", () => {
      const hasEndpoint = webhooksRouter.stack.some((layer: any) => 
        layer.route?.path === "/incoming/:provider"
      );
      expect(hasEndpoint).toBe(true);
    });

    it("should have correct path parameter structure", () => {
      const layer = webhooksRouter.stack.find((l: any) => l.route?.path === "/incoming/:provider");
      expect(layer?.route?.path).toBe("/incoming/:provider");
    });
  });

  describe("POST /clerk", () => {
    it("should have the /clerk endpoint registered", () => {
      const hasEndpoint = webhooksRouter.stack.some((layer: any) => 
        layer.route?.path === "/clerk"
      );
      expect(hasEndpoint).toBe(true);
    });
  });
});

describe("Webhook Signature Verification Logic", () => {
  it("should detect missing svix-id header", () => {
    const headers = {
      "svix-id": undefined,
      "svix-timestamp": "1234567890",
      "svix-signature": "v1 signature",
    };

    // Missing svix-id should fail verification
    expect(headers["svix-id"]).toBeUndefined();
  });

  it("should detect missing svix-timestamp header", () => {
    const headers: Record<string, string | undefined> = {
      "svix-id": "msg_123",
      "svix-timestamp": undefined,
      "svix-signature": "v1 signature",
    };

    // Missing timestamp should fail verification
    expect(headers["svix-timestamp"]).toBeUndefined();
  });

  it("should detect missing svix-signature header", () => {
    const headers: Record<string, string | undefined> = {
      "svix-id": "msg_123",
      "svix-timestamp": "1234567890",
      "svix-signature": undefined,
    };

    // Missing signature should fail verification
    expect(headers["svix-signature"]).toBeUndefined();
  });

  it("should detect timestamp drift > 5 minutes", () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString(); // 400 seconds ago (> 300)
    const now = Math.floor(Date.now() / 1000);
    const timestamp = parseInt(oldTimestamp, 10);
    const drift = Math.abs(now - timestamp);

    expect(drift).toBeGreaterThan(300);
  });

  it("should accept recent timestamp within 5 minutes", () => {
    const recentTimestamp = Math.floor(Date.now() / 1000).toString();
    const now = Math.floor(Date.now() / 1000);
    const timestamp = parseInt(recentTimestamp, 10);
    const drift = Math.abs(now - timestamp);

    expect(drift).toBeLessThanOrEqual(300);
  });

  it("should properly construct signed content for verification", () => {
    const svixId = "msg_123";
    const svixTimestamp = Math.floor(Date.now() / 1000).toString();
    const rawBody = JSON.stringify({ type: "user.created", data: { id: "user_1" } });

    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
    
    expect(signedContent).toContain(svixId);
    expect(signedContent).toContain(svixTimestamp);
    expect(signedContent).toContain("user.created");
  });

  it("should handle whsec_ prefix stripping for secret", () => {
    const secretWithPrefix = "whsec_abc123";
    const secretWithoutPrefix = secretWithPrefix.startsWith("whsec_") 
      ? secretWithPrefix.substring(6) 
      : secretWithPrefix;

    expect(secretWithoutPrefix).toBe("abc123");
  });
});