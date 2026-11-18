// OpenAI: Costs API, GET /v1/organization/costs with an Admin key (org owners only).
// Daily buckets (bucket_width=1d) grouped by line_item; amount.value is in major units
// (dollars), per OpenAI's usage cookbook.
import { collectPages, getJson, isoDay } from "../http";
import type { DailyCost, DailyCostAdapter } from "../types";

const BASE = "https://api.openai.com/v1/organization/costs";

interface CostsPage {
  data: Array<{ start_time: number; results: Array<{ amount: { value: number; currency: string }; line_item: string | null }> }>;
  has_more: boolean;
  next_page: string | null;
}

export const openaiAdapter: DailyCostAdapter = {
  id: "openai",
  mode: "daily",
  label: "OpenAI (API platform)",
  keyHelp: "platform.openai.com > Settings > Organization > Admin keys. Org owners only. ChatGPT Plus is billed separately; track it as a subscription.",
  fields: [{ name: "apiKey", label: "Admin API key", secret: true, required: true, placeholder: "sk-admin-..." }],

  async fetchDailyCosts({ secret, window, fetch }) {
    const headers = { authorization: `Bearer ${secret}` };
    const pages = await collectPages<CostsPage>(cursor => {
      const params = new URLSearchParams({
        start_time: String(Math.floor(window.from.getTime() / 1000)),
        end_time: String(Math.floor(window.to.getTime() / 1000)),
        bucket_width: "1d", limit: "180",
      });
      params.append("group_by", "line_item");
      if (cursor) params.set("page", cursor);
      return getJson<CostsPage>(fetch, `${BASE}?${params}`, headers, "OpenAI");
    });
    const costs: DailyCost[] = [];
    for (const bucket of pages.flatMap(p => p.data)) {
      for (const result of bucket.results) {
        const item = result.line_item ?? "other";
        costs.push({
          date: isoDay(new Date(bucket.start_time * 1000)),
          key: item,
          amount: Number(result.amount.value),
          currency: (result.amount.currency || "usd").toUpperCase(),
          description: `OpenAI ${item}`,
        });
      }
    }
    return costs;
  },
};
