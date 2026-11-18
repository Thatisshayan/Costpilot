import { describe, expect, it, vi } from "vitest";
import { anthropicAdapter } from "../adapters/anthropic";
import { openaiAdapter } from "../adapters/openai";
import { ProviderError, type SyncWindow } from "../types";

const window: SyncWindow = { from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-11-03T00:00:00Z") };

function fakeFetch(...bodies: Array<{ status?: number; body: unknown }>) {
  const calls: string[] = [];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(String(url));
    const next = bodies.shift() ?? { body: {} };
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200, headers: init?.headers as HeadersInit });
  });
  return { impl: impl as unknown as typeof fetch, calls, headers: () => impl.mock.calls.map(c => new Headers(c[1]?.headers)) };
}

describe("anthropic adapter", () => {
  it("requests daily buckets by model and converts fractional cents to dollars", async () => {
    const f = fakeFetch({
      body: {
        data: [
          { starting_at: "2026-11-01T00:00:00Z", cost: { amount: "1234.5", currency: "USD" }, group: { model: "claude-opus-5-5" } },
          { starting_at: "2026-11-02T00:00:00Z", cost: { amount: "50", currency: "USD" }, group: { model: null } },
        ],
        has_more: false, next_page: null,
      },
    });
    const costs = await anthropicAdapter.fetchDailyCosts({ secret: "sk-ant-admin-x", config: {}, window, fetch: f.impl });
    expect(costs).toEqual([
      { date: "2026-11-01", key: "claude-opus-5-5", amount: 12.345, currency: "USD", description: "Anthropic claude-opus-5-5" },
      { date: "2026-11-02", key: "other", amount: 0.5, currency: "USD", description: "Anthropic usage (tools, code execution, other)" },
    ]);
    const url = new URL(f.calls[0]);
    expect(url.pathname).toBe("/v1/organizations/analytics/cost");
    expect(url.searchParams.get("time_bucket_width")).toBe("1d");
    expect(url.searchParams.getAll("group_by[]")).toEqual(["model"]);
    expect(f.headers()[0].get("x-api-key")).toBe("sk-ant-admin-x");
    expect(f.headers()[0].get("anthropic-beta")).toBe("analytics-usage-cost-2026-08-24");
  });

  it("follows next_page and splits ranges longer than 31 days", async () => {
    const page = (next: string | null) => ({ body: { data: [], has_more: next !== null, next_page: next } });
    const f = fakeFetch(page("p2"), page(null), page(null));
    const long: SyncWindow = { from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-10-15T00:00:00Z") };
    await anthropicAdapter.fetchDailyCosts({ secret: "k", config: {}, window: long, fetch: f.impl });
    expect(f.calls).toHaveLength(3);
    expect(new URL(f.calls[1]).searchParams.get("page")).toBe("p2");
    expect(new URL(f.calls[2]).searchParams.get("starting_at")).toBe("2026-10-02T00:00:00.000Z");
  });

  it("keeps only rows inside each requested chunk, so overlapping replies are not double counted", async () => {
    const reply = { body: { data: [{ starting_at: "2026-09-10T00:00:00Z", cost: { amount: "100", currency: "USD" }, group: { model: "m" } }], has_more: false, next_page: null } };
    const f = fakeFetch(reply, structuredClone(reply));
    const long: SyncWindow = { from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-10-15T00:00:00Z") };
    const costs = await anthropicAdapter.fetchDailyCosts({ secret: "k", config: {}, window: long, fetch: f.impl });
    expect(costs).toHaveLength(1);
  });

  it("never asks for data before 2026-01-01", async () => {
    const f = fakeFetch({ body: { data: [], has_more: false, next_page: null } });
    await anthropicAdapter.fetchDailyCosts({ secret: "k", config: {}, window: { from: new Date("2025-12-20T00:00:00Z"), to: new Date("2026-01-05T00:00:00Z") }, fetch: f.impl });
    expect(new URL(f.calls[0]).searchParams.get("starting_at")).toBe("2026-01-01T00:00:00.000Z");
  });

  it("refuses non-admin Anthropic keys before calling the API", async () => {
    const f = fakeFetch();
    for (const secret of ["sk-ant-usr-123", "sk-ant-api03-123"]) {
      await expect(anthropicAdapter.fetchDailyCosts({ secret, config: {}, window, fetch: f.impl })).rejects.toThrow(/Admin API key/);
    }
    expect(f.calls).toHaveLength(0);
  });

  it("turns a rejected key into an actionable error", async () => {
    const f = fakeFetch({ status: 401, body: { error: "invalid" } });
    await expect(anthropicAdapter.fetchDailyCosts({ secret: "bad", config: {}, window, fetch: f.impl }))
      .rejects.toThrow(ProviderError);
  });
});

describe("openai adapter", () => {
  it("requests daily line-item costs with an admin bearer key and keeps dollar amounts", async () => {
    const f = fakeFetch({
      body: {
        data: [{ start_time: window.from.getTime() / 1000, results: [{ amount: { value: 1.239, currency: "usd" }, line_item: "gpt-5, input" }] }],
        has_more: false, next_page: null,
      },
    });
    const costs = await openaiAdapter.fetchDailyCosts({ secret: "sk-admin-x", config: {}, window, fetch: f.impl });
    expect(costs).toEqual([{ date: "2026-11-01", key: "gpt-5, input", amount: 1.239, currency: "USD", description: "OpenAI gpt-5, input" }]);
    const url = new URL(f.calls[0]);
    expect(url.pathname).toBe("/v1/organization/costs");
    expect(url.searchParams.get("bucket_width")).toBe("1d");
    expect(url.searchParams.getAll("group_by")).toEqual(["line_item"]);
    expect(url.searchParams.get("start_time")).toBe(String(window.from.getTime() / 1000));
    expect(f.headers()[0].get("authorization")).toBe("Bearer sk-admin-x");
  });
});
