import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticatedFetch, setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react/custom-fetch";

describe("authenticated client requests", () => {
  afterEach(() => {
    setAuthTokenGetter(null);
    setBaseUrl(null);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("sends web API requests to the configured origin with a Clerk bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setBaseUrl("https://web-api.example.test");
    setAuthTokenGetter(async () => "web-session-token");

    await authenticatedFetch("/api/expenses");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://web-api.example.test/api/expenses");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("authorization")).toBe(
      "Bearer web-session-token",
    );
  });

  it("sends mobile API requests to the configured origin with a Clerk bearer token", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_ORIGIN", "https://mobile-api.example.test");
    vi.resetModules();
    const { apiResponse, setApiAuthTokenGetter } = await import("../../../mobile-app/src/lib/api");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setApiAuthTokenGetter(async () => "mobile-session-token");

    await apiResponse("/expenses");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://mobile-api.example.test/api/expenses");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("authorization")).toBe(
      "Bearer mobile-session-token",
    );
  });
  it("does not attach a mobile session to a foreign API origin", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_ORIGIN", "https://mobile-api.example.test");
    vi.resetModules();
    const { apiResponse, setApiAuthTokenGetter } = await import("../../../mobile-app/src/lib/api");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setApiAuthTokenGetter(async () => "mobile-session-token");
    await expect(apiResponse("https://foreign.example.test/expenses")).rejects.toThrow("configured origin");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to send a mobile session over plain HTTP in release builds", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_ORIGIN", "http://mobile-api.example.test");
    vi.resetModules();
    const { apiResponse, setApiAuthTokenGetter, assertSecureApiOrigin } = await import("../../../mobile-app/src/lib/api");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const getter = vi.fn(async () => "mobile-session-token");
    setApiAuthTokenGetter(getter);
    await expect(apiResponse("/expenses")).rejects.toThrow("HTTPS");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
    expect(() => assertSecureApiOrigin("http://192.168.1.5:8080", true)).not.toThrow();
  });

  it("keeps the native app to personal expenses", async () => {
    const { personalExpensesOnly, isPersonalExpense } = await import("../../../mobile-app/src/lib/personal-scope");
    expect(personalExpensesOnly([{ id: 1, workspaceId: null }, { id: 2, workspaceId: 7 }, { id: 3 }]).map(e => e.id)).toEqual([1, 3]);
    expect(isPersonalExpense({ workspaceId: 7 })).toBe(false);
  });

  it("does not attach a web session to a foreign API origin", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    setBaseUrl("https://web-api.example.test");
    setAuthTokenGetter(async () => "web-session-token");
    await expect(authenticatedFetch("https://foreign.example.test/api/expenses")).rejects.toThrow("configured origin");
    expect(fetchMock).not.toHaveBeenCalled();
  });

});
