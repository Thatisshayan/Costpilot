// OpenRouter: GET /api/v1/activity with a management key returns per-model daily activity for
// the last 30 completed UTC days. `usage` is USD of OpenRouter credits spent; BYOK inference
// (`byok_usage_inference`) is billed by the upstream provider, so it is not counted here.
import { getJson } from "../http";
import type { DailyCost, DailyCostAdapter } from "../types";

interface ActivityPage {
  data: Array<{ date: string; model: string; usage: number }>;
}

export const openrouterAdapter: DailyCostAdapter = {
  id: "openrouter",
  mode: "daily",
  label: "OpenRouter",
  keyHelp: "openrouter.ai/settings/management-keys: create a management key (regular API keys cannot read activity). OpenRouter keeps the last 30 days; today's spend appears after the day ends.",
  fields: [{ name: "apiKey", label: "Management key", secret: true, required: true, placeholder: "sk-or-v1-..." }],

  async fetchDailyCosts({ secret, fetch }) {
    const page = await getJson<ActivityPage>(fetch, "https://openrouter.ai/api/v1/activity", { authorization: `Bearer ${secret}` }, "OpenRouter");
    return page.data.map((row): DailyCost => ({
      date: row.date.slice(0, 10),
      key: row.model,
      amount: Number(row.usage),
      currency: "USD",
      description: `OpenRouter ${row.model}`,
    }));
  },
};
