// Deepgram: GET /v1/projects/{project_id}/billing/breakdown returns `dollars` (USD) per day,
// grouped here by line item (e.g. "streaming::nova-3"). start/end are inclusive YYYY-MM-DD.
import { getJson, isoDay } from "../http";
import { ProviderError, type DailyCost, type DailyCostAdapter } from "../types";

interface BillingBreakdown {
  results: Array<{ dollars: number; grouping: { start: string; line_item: string | null } }>;
}

export const deepgramAdapter: DailyCostAdapter = {
  id: "deepgram",
  mode: "daily",
  label: "Deepgram",
  keyHelp: "console.deepgram.com > API Keys: create a key with billing read access (Member role or higher). The project ID is under Settings.",
  fields: [
    { name: "apiKey", label: "API key", secret: true, required: true },
    { name: "projectId", label: "Project ID", secret: false, required: true },
  ],

  async fetchDailyCosts({ secret, config, window, fetch }) {
    const projectId = config.projectId?.trim();
    if (!projectId) throw new ProviderError("Deepgram needs a project ID.");
    const lastDay = new Date(window.to.getTime() - 86_400_000);
    const params = new URLSearchParams({ start: isoDay(window.from), end: isoDay(lastDay), grouping: "line_item" });
    const breakdown = await getJson<BillingBreakdown>(
      fetch, `https://api.deepgram.com/v1/projects/${encodeURIComponent(projectId)}/billing/breakdown?${params}`,
      { authorization: `Token ${secret}` }, "Deepgram",
    );
    return breakdown.results.map((r): DailyCost => {
      const item = r.grouping.line_item ?? "usage";
      return { date: r.grouping.start.slice(0, 10), key: item, amount: Number(r.dollars), currency: "USD", description: `Deepgram ${item}` };
    });
  },
};
