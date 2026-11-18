// Anthropic: Usage and Cost Analytics API, GET /v1/organizations/analytics/cost.
// Requires an Admin API key (sk-ant-admin...). Amounts are fractional cents (minor units).
// Ranges with a time bucket may span at most 31 days, and start no earlier than 2026-01-01.
// Figures can be revised until ~7 days after month end; the engine re-pulls recent days.
import { chunkWindow, collectPages, getJson, isoDay } from "../http";
import { ProviderError, type DailyCost, type DailyCostAdapter } from "../types";

const BASE = "https://api.anthropic.com/v1/organizations/analytics/cost";
const EARLIEST = new Date("2026-01-01T00:00:00Z");

interface CostPage {
  data: Array<{ starting_at: string; cost: { amount: string; currency: string }; group: { model: string | null } }>;
  has_more: boolean;
  next_page: string | null;
}

export const anthropicAdapter: DailyCostAdapter = {
  id: "anthropic",
  mode: "daily",
  label: "Anthropic (Claude API)",
  keyHelp: "Needs an Admin key (sk-ant-admin...), not a regular or user key: Claude Console > Settings > Admin keys. Individual accounts first set up an organization at platform.claude.com/settings/organization. A Claude Max/Pro plan is billed separately; track it as a subscription.",
  fields: [{ name: "apiKey", label: "Admin API key", secret: true, required: true, placeholder: "sk-ant-admin..." }],

  async fetchDailyCosts({ secret, window, fetch }) {
    if (secret.startsWith("sk-ant-") && !secret.startsWith("sk-ant-admin")) {
      throw new ProviderError("This is not an Admin API key (sk-ant-admin...). Cost data needs one: individual Console accounts must first set up an organization at platform.claude.com/settings/organization, then create a key under Settings > Admin keys.");
    }
    const from = window.from < EARLIEST ? EARLIEST : window.from;
    const headers = { "x-api-key": secret, "anthropic-version": "2023-06-01", "anthropic-beta": "analytics-usage-cost-2026-08-24" };
    const costs: DailyCost[] = [];
    for (const chunk of chunkWindow(from, window.to, 31)) {
      const pages = await collectPages<CostPage>(cursor => {
        const params = new URLSearchParams({
          starting_at: chunk.from.toISOString(), ending_at: chunk.to.toISOString(),
          time_bucket_width: "1d", order_by: "time", order: "asc", limit: "1000",
        });
        params.append("group_by[]", "model");
        if (cursor) params.set("page", cursor);
        return getJson<CostPage>(fetch, `${BASE}?${params}`, headers, "Anthropic");
      });
      for (const row of pages.flatMap(p => p.data)) {
        // Chunks are summed by the engine, so a row outside its chunk would be counted twice.
        const start = new Date(row.starting_at);
        if (start < chunk.from || start >= chunk.to) continue;
        const model = row.group.model ?? "other";
        costs.push({
          date: isoDay(new Date(row.starting_at)),
          key: model,
          amount: Number(row.cost.amount) / 100,
          currency: (row.cost.currency || "USD").toUpperCase(),
          description: model === "other" ? "Anthropic usage (tools, code execution, other)" : `Anthropic ${model}`,
        });
      }
    }
    return costs;
  },
};
