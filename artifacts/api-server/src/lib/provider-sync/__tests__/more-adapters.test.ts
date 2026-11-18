import { describe, expect, it, vi } from "vitest";
import { awsAdapter } from "../adapters/aws";
import { deepgramAdapter } from "../adapters/deepgram";
import { heygenAdapter } from "../adapters/heygen";
import { openrouterAdapter } from "../adapters/openrouter";
import { vercelAdapter } from "../adapters/vercel";
import { ProviderError, type SyncWindow } from "../types";

const window: SyncWindow = { from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-11-03T00:00:00Z") };

function fakeFetch(...replies: Array<{ status?: number; body: unknown; raw?: boolean }>) {
  const impl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const next = replies.shift() ?? { body: {} };
    return new Response(next.raw ? String(next.body) : JSON.stringify(next.body), { status: next.status ?? 200 });
  });
  const call = (i: number) => ({ url: new URL(String(impl.mock.calls[i][0])), init: impl.mock.calls[i][1] ?? {} });
  return { impl: impl as unknown as typeof fetch, call, count: () => impl.mock.calls.length };
}

describe("vercel adapter", () => {
  it("parses FOCUS JSON lines per day and service, labelling non-usage charges", async () => {
    const lines = [
      { BilledCost: 1.5, BillingCurrency: "USD", ChargeCategory: "Usage", ChargePeriodStart: "2026-11-01T00:00:00Z", ServiceName: "Function Invocations" },
      { BilledCost: "20", BillingCurrency: "USD", ChargeCategory: "Purchase", ChargePeriodStart: "2026-11-01T00:00:00Z", ServiceName: "Pro Plan" },
    ].map(l => JSON.stringify(l)).join("\n") + "\n";
    const f = fakeFetch({ body: lines, raw: true });
    const costs = await vercelAdapter.fetchDailyCosts({ secret: "tok", config: { teamId: "team_123" }, window, fetch: f.impl });
    expect(costs.map(c => [c.date, c.key, c.amount])).toEqual([
      ["2026-11-01", "Function Invocations", 1.5], ["2026-11-01", "Pro Plan (purchase)", 20],
    ]);
    const { url, init } = f.call(0);
    expect(url.pathname).toBe("/v1/billing/charges");
    expect(url.searchParams.get("teamId")).toBe("team_123");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer tok");
  });

  it("sends a team slug as slug", async () => {
    const f = fakeFetch({ body: "", raw: true });
    await vercelAdapter.fetchDailyCosts({ secret: "tok", config: { teamId: "my-team" }, window, fetch: f.impl });
    expect(f.call(0).url.searchParams.get("slug")).toBe("my-team");
  });
});

describe("openrouter adapter", () => {
  it("books credit usage per model and day, excluding BYOK", async () => {
    const f = fakeFetch({ body: { data: [{ date: "2026-11-01", model: "openai/gpt-4.1", usage: 0.015, byok_usage_inference: 9 }] } });
    const costs = await openrouterAdapter.fetchDailyCosts({ secret: "sk-or", config: {}, window, fetch: f.impl });
    expect(costs).toEqual([{ date: "2026-11-01", key: "openai/gpt-4.1", amount: 0.015, currency: "USD", description: "OpenRouter openai/gpt-4.1" }]);
    expect(f.call(0).url.pathname).toBe("/api/v1/activity");
  });
});

describe("deepgram adapter", () => {
  it("asks for an inclusive date range grouped by line item, with Token auth", async () => {
    const f = fakeFetch({ body: { results: [{ dollars: 0.25, grouping: { start: "2026-11-01", line_item: "streaming::nova-3" } }] } });
    const costs = await deepgramAdapter.fetchDailyCosts({ secret: "dg", config: { projectId: "p1" }, window, fetch: f.impl });
    expect(costs).toEqual([{ date: "2026-11-01", key: "streaming::nova-3", amount: 0.25, currency: "USD", description: "Deepgram streaming::nova-3" }]);
    const { url, init } = f.call(0);
    expect(url.pathname).toBe("/v1/projects/p1/billing/breakdown");
    expect([url.searchParams.get("start"), url.searchParams.get("end")]).toEqual(["2026-11-01", "2026-11-02"]);
    expect(new Headers(init.headers).get("authorization")).toBe("Token dg");
  });

  it("requires a project id", async () => {
    await expect(deepgramAdapter.fetchDailyCosts({ secret: "dg", config: {}, window, fetch: fakeFetch().impl })).rejects.toThrow(ProviderError);
  });
});

describe("aws adapter", () => {
  const secret = JSON.stringify({ accessKeyId: "AKIA1", secretAccessKey: "s" });

  it("signs a Cost Explorer request and follows NextPageToken", async () => {
    const day = (service: string, amount: string) => ({ TimePeriod: { Start: "2026-11-01" }, Groups: [{ Keys: [service], Metrics: { UnblendedCost: { Amount: amount, Unit: "USD" } } }] });
    const f = fakeFetch({ body: { ResultsByTime: [day("Amazon EC2", "1.234")], NextPageToken: "t2" } }, { body: { ResultsByTime: [day("Amazon S3", "0.5")] } });
    const costs = await awsAdapter.fetchDailyCosts({ secret, config: {}, window, fetch: f.impl });
    expect(costs.map(c => [c.key, c.amount])).toEqual([["Amazon EC2", 1.234], ["Amazon S3", 0.5]]);
    const first = f.call(0);
    const headers = new Headers(first.init.headers);
    expect(first.url.host).toBe("ce.us-east-1.amazonaws.com");
    expect(headers.get("x-amz-target")).toBe("AWSInsightsIndexService.GetCostAndUsage");
    expect(headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIA1\/\d{8}\/us-east-1\/ce\/aws4_request/);
    expect(JSON.parse(String(first.init.body))).toMatchObject({ TimePeriod: { Start: "2026-11-01", End: "2026-11-03" }, Granularity: "DAILY" });
    expect(JSON.parse(String(f.call(1).init.body)).NextPageToken).toBe("t2");
  });

  it("syncs at most daily and needs both keys", async () => {
    expect(awsAdapter.minIntervalHours).toBe(24);
    await expect(awsAdapter.fetchDailyCosts({ secret: "AKIA-only", config: {}, window, fetch: fakeFetch().impl })).rejects.toThrow(/access key ID and a secret/);
  });
});

describe("heygen adapter", () => {
  const read = (data: unknown) => heygenAdapter.readCounter({ secret: "hg", config: {}, fetch: fakeFetch({ body: { data } }).impl });

  it("reads a USD wallet as a balance and usage billing as spend", async () => {
    await expect(read({ billing_type: "wallet", wallet: { currency: "usd", remaining_balance: 42.5 } })).resolves.toMatchObject({ kind: "balance", value: 42.5 });
    await expect(read({ billing_type: "usage_based", usage_based: { spending_current_usd: 7 } })).resolves.toMatchObject({ kind: "spend", value: 7 });
  });

  it("refuses credit subscriptions, which carry no dollar amounts", async () => {
    await expect(read({ billing_type: "subscription", subscription: {} })).rejects.toThrow(/Subscriptions/);
    await expect(read({ billing_type: "wallet", wallet: { currency: "credits", remaining_balance: 900 } })).rejects.toThrow(ProviderError);
  });
});
