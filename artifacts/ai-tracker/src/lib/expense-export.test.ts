import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react/custom-fetch";
import { requestExpenseExport } from "./expense-export";

describe("requestExpenseExport", () => {
  afterEach(() => {
    setAuthTokenGetter(null);
    setBaseUrl(null);
    vi.unstubAllGlobals();
  });

  it("posts the active scope with a bearer token and returns the server filename", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ID,Date\n", {
      status: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="costpilot-expenses-workspace-7-2026-11-05.csv"' },
    }));
    vi.stubGlobal("fetch", fetchMock);
    setBaseUrl("https://api.example.test");
    setAuthTokenGetter(async () => "session-token");

    const result = await requestExpenseExport("csv", 7);

    expect(result.filename).toBe("costpilot-expenses-workspace-7-2026-11-05.csv");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/api/exports/generate");
    expect(JSON.parse(init.body)).toEqual({ module: "expenses", format: "csv", workspaceId: 7 });
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer session-token");
  });

  it("sends null for personal scope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("%PDF", { status: 200, headers: { "Content-Type": "application/pdf" } }));
    vi.stubGlobal("fetch", fetchMock);
    await requestExpenseExport("pdf", null);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).workspaceId).toBeNull();
  });

  it("reports failures instead of saving an error body as a file", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":"x"}', { status: 403, headers: { "Content-Type": "application/json" } })));
    await expect(requestExpenseExport("csv", 9)).rejects.toThrow("do not have access");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })));
    await expect(requestExpenseExport("csv", null)).rejects.toThrow("unexpected file type");
  });
});
