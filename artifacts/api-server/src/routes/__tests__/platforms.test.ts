import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockDbState, mockAuth, mockKms } = vi.hoisted(() => {
  const state: any = {
    selectResult: Promise.resolve([]),
    insertResult: Promise.resolve([]),
    updateResult: Promise.resolve([]),
    deleteResult: Promise.resolve([{ id: 1 }]),
  };

  return {
    mockDbState: state,
    mockAuth: {
      isWorkspaceMember: () => Promise.resolve(true),
    },
    mockKms: {
      encrypt: (text: string) => `encrypted:${text}`,
      decrypt: (text: string) => text.replace("encrypted:", ""),
    },
  };
});

function thenable(result: any) {
  return {
    then: (resolve: any) => Promise.resolve(result).then(resolve),
    catch: () => {},
  };
}

vi.mock("@workspace/db", () => ({
  db: {
    execute: () => Promise.resolve(),
    select: () => {
      const chain: any = {};
      chain.from = () => chain;
      chain.where = () => chain;
      chain.orderBy = () => chain;
      chain.then = (resolve: any) => Promise.resolve(mockDbState.selectResult).then(resolve);
      chain.catch = () => {};
      return chain;
    },
    insert: () => ({
      values: (values: any) => {
        mockDbState.lastInsert = values;
        return { returning: () => thenable(mockDbState.insertResult) };
      },
    }),
    update: () => ({
      set: (values: any) => (mockDbState.lastSet = values, {
        where: () => ({
          returning: () => thenable(mockDbState.updateResult),
        }),
      }),
    }),
    delete: () => ({ where: () => ({ returning: () => thenable(mockDbState.deleteResult) }) }),
  },
  platformsTable: {},
}));

vi.mock("@workspace/api-zod", () => ({
  CreatePlatformBody: { parse: (input: any) => input || {} },
  UpdatePlatformBody: { parse: (input: any) => input || {} },
  GetPlatformParams: { parse: (input: any) => input },
  UpdatePlatformParams: { parse: (input: any) => input },
  DeletePlatformParams: { parse: (input: any) => input },
}));

vi.mock("../../lib/kms-vault", () => ({
  encrypt: (text: string) => mockKms.encrypt(text),
  decrypt: (text: string) => mockKms.decrypt(text),
}));

vi.mock("../../middlewares/auth", () => ({
  isWorkspaceMember: (...args: any[]) => (mockAuth.isWorkspaceMember as Function)(...args),
}));

import platformsRouter from "../platforms";

const makeMockRequest = (body: any = {}, params: any = {}, query: any = {}, userId = "user-1") => ({
  userId,
  body,
  params,
  query,
  headers: {},
});

const makeMockResponse = () => {
  const res: any = {};
  res.statusCode = 200;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.jsonData = data;
    return res;
  };
  res.send = () => res;
  return res;
};

function getHandler(path: string, method: string): Function {
  for (const layer of platformsRouter.stack) {
    if (layer.route) {
      const route = layer.route as any;
      const routeMethods = route.methods || {};
      const methods = Array.isArray(routeMethods) ? routeMethods : Object.keys(routeMethods).filter((k) => routeMethods[k]);
      if (route.path === path && methods.some((m: string) => m.toLowerCase() === method.toLowerCase())) {
        return route.stack[0].handle as Function;
      }
    }
  }
  throw new Error(`Handler not found for ${method} ${path}`);
}

describe("Platforms API", () => {
  beforeEach(() => {
    mockDbState.selectResult = Promise.resolve([]);
    mockDbState.insertResult = Promise.resolve([]);
    mockDbState.updateResult = Promise.resolve([]);
    mockDbState.lastSet = undefined;
    mockDbState.lastInsert = undefined;
    mockAuth.isWorkspaceMember = () => Promise.resolve(true);
    mockKms.encrypt = (text: string) => `encrypted:${text}`;
    mockKms.decrypt = (text: string) => text.replace("encrypted:", "");
  });

  describe("GET /", () => {
    it("should return a list of platforms", async () => {
      const handler = getHandler("/", "get");
      expect(handler).toBeDefined();

      const now = new Date();
      mockDbState.selectResult = Promise.resolve([
        { id: 1, name: "OpenAI", website: "https://openai.com", category: "LLM", apiKey: "encrypted:sk-test", createdAt: now },
      ]);

      const req = makeMockRequest();
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.jsonData)).toBe(true);
      expect(res.jsonData).toHaveLength(1);
      expect(res.jsonData[0].name).toBe("OpenAI");
    });

    it("should mask apiKey by default (no reveal)", async () => {
      const handler = getHandler("/", "get");
      const now = new Date();
      mockDbState.selectResult = Promise.resolve([
        { id: 1, name: "OpenAI", apiKey: "encrypted:sk-test-secret", createdAt: now },
      ]);

      const req = makeMockRequest();
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.jsonData[0].apiKey).toBe("••••••••");
    });

    it("never decrypts credentials, even when reveal is requested", async () => {
      const handler = getHandler("/", "get");
      let decrypted = false;
      mockKms.decrypt = () => { decrypted = true; return "sk-real-key"; };
      mockDbState.selectResult = Promise.resolve([
        { id: 1, name: "OpenAI", workspaceId: null, apiKey: "encrypted:sk-real-key", createdAt: new Date() },
      ]);
      const res = makeMockResponse();
      await handler({ ...makeMockRequest({}, {}, { reveal: "true" }), headers: { "x-reveal-key": "true" } }, res);
      expect(res.jsonData[0].apiKey).toBe("••••••••");
      expect(JSON.stringify(res.jsonData)).not.toContain("sk-real-key");
      expect(decrypted).toBe(false);
    });

    it("never returns plaintext from GET /:id", async () => {
      mockDbState.selectResult = Promise.resolve([{ id: 1, name: "OpenAI", apiKey: "encrypted:sk-real-key", createdAt: new Date() }]);
      const res = makeMockResponse();
      await getHandler("/:id", "get")(makeMockRequest({}, { id: "1" }, { reveal: "true" }), res);
      expect(res.jsonData.apiKey).toBe("••••••••");
    });
  });

  describe("POST /", () => {
    it("should create a platform and encrypt apiKey", async () => {
      const handler = getHandler("/", "post");
      expect(handler).toBeDefined();

      const now = new Date();
      mockDbState.insertResult = Promise.resolve([
        { id: 1, name: "Test Platform", apiKey: "encrypted:sk-test-key", createdAt: now },
      ]);

      const req = makeMockRequest({ name: "Test Platform", apiKey: "sk-test-key" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.jsonData.apiKey).toBe("••••••••");
    });

    it("should create platform without apiKey", async () => {
      const handler = getHandler("/", "post");
      const now = new Date();
      mockDbState.insertResult = Promise.resolve([
        { id: 2, name: "No Key Platform", apiKey: null, createdAt: now },
      ]);

      const req = makeMockRequest({ name: "No Key Platform" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.jsonData.apiKey).toBeNull();
    });
  });

  describe("GET /:id", () => {
    it("should return a platform by id", async () => {
      const handler = getHandler("/:id", "get");
      expect(handler).toBeDefined();

      const now = new Date();
      mockDbState.selectResult = Promise.resolve([
        { id: 3, name: "Anthropic", apiKey: "encrypted:sk-ant", createdAt: now },
      ]);

      const req = makeMockRequest({}, { id: "3" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.name).toBe("Anthropic");
    });

    it("should return 404 for non-existent platform", async () => {
      const handler = getHandler("/:id", "get");
      mockDbState.selectResult = Promise.resolve([]);
      const req = makeMockRequest({}, { id: "999" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.jsonData.error).toBe("Not found");
    });
  });

  describe("PATCH /:id credentials", () => {
    const stored = { id: 1, name: "OpenAI", apiKey: "encrypted:sk-original", createdAt: new Date() };

    it("leaves the stored credential untouched when apiKey is omitted", async () => {
      mockDbState.updateResult = Promise.resolve([stored]);
      const res = makeMockResponse();
      await getHandler("/:id", "patch")(makeMockRequest({ notes: "renamed" }, { id: "1" }), res);
      expect(res.statusCode).toBe(200);
      expect(mockDbState.lastSet).toEqual({ notes: "renamed" });
      expect(res.jsonData.apiKey).toBe("••••••••");
    });

    it.each(["••••••••", "********", "  ", ""])("rejects masked or blank placeholder %j without writing", async (placeholder) => {
      const res = makeMockResponse();
      await getHandler("/:id", "patch")(makeMockRequest({ name: "OpenAI", apiKey: placeholder }, { id: "1" }), res);
      expect(res.statusCode).toBe(400);
      expect(mockDbState.lastSet).toBeUndefined();
    });

    it("encrypts an explicit replacement credential", async () => {
      mockDbState.updateResult = Promise.resolve([{ ...stored, apiKey: "encrypted:sk-new" }]);
      const res = makeMockResponse();
      await getHandler("/:id", "patch")(makeMockRequest({ apiKey: "sk-new" }, { id: "1" }), res);
      expect(res.statusCode).toBe(200);
      expect(mockDbState.lastSet).toEqual({ apiKey: "encrypted:sk-new" });
      expect(JSON.stringify(res.jsonData)).not.toContain("sk-new");
    });

    it("clears the credential only when null is sent explicitly", async () => {
      mockDbState.updateResult = Promise.resolve([{ ...stored, apiKey: null }]);
      const res = makeMockResponse();
      await getHandler("/:id", "patch")(makeMockRequest({ apiKey: null }, { id: "1" }), res);
      expect(res.statusCode).toBe(200);
      expect(mockDbState.lastSet).toEqual({ apiKey: null });
      expect(res.jsonData.apiKey).toBeNull();
    });

    it("rejects a masked placeholder on create", async () => {
      const res = makeMockResponse();
      await getHandler("/", "post")(makeMockRequest({ name: "OpenAI", apiKey: "••••••••" }), res);
      expect(res.statusCode).toBe(400);
      expect(mockDbState.lastInsert).toBeUndefined();
    });
  });

  describe("PATCH /:id", () => {
    it("should update an existing platform", async () => {
      const handler = getHandler("/:id", "patch");
      expect(handler).toBeDefined();

      const now = new Date();
      const updated = { id: 1, name: "Updated Platform", apiKey: "encrypted:new-key", createdAt: now };
      mockDbState.updateResult = Promise.resolve([updated]);
      mockDbState.selectResult = Promise.resolve([updated]);

      const req = makeMockRequest({ name: "Updated Platform", apiKey: "new-key" }, { id: "1" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.name).toBe("Updated Platform");
    });

    it("should return 404 when updating non-existent platform", async () => {
      const handler = getHandler("/:id", "patch");
      mockDbState.updateResult = Promise.resolve([]);
      const req = makeMockRequest({ name: "Ghost" }, { id: "999" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.jsonData.error).toBe("Not found");
    });
  });

  describe("DELETE /:id", () => {
    it("reports a missing or denied delete rather than success", async () => {
      mockDbState.deleteResult = Promise.resolve([]);
      const res = makeMockResponse();
      await getHandler("/:id", "delete")(makeMockRequest({}, { id: "999" }), res);
      expect(res.statusCode).toBe(404);
      mockDbState.deleteResult = Promise.resolve([{ id: 1 }]);
    });
    it("should delete a platform and return 204", async () => {
      const handler = getHandler("/:id", "delete");
      expect(handler).toBeDefined();
      const req = makeMockRequest({}, { id: "1" });
      const res = makeMockResponse();
      await handler(req, res);
      expect(res.statusCode).toBe(204);
    });
  });
});
