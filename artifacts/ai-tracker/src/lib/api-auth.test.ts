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

});
