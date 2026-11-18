// Vercel: GET /v1/billing/charges returns FOCUS v1.3 charges as JSON lines, 1-day granularity,
// at most one year per request. BilledCost is USD. Credits arrive as negative amounts.
// Plan fees (e.g. Pro) arrive as "Purchase" charges, so do not also track them as a subscription.
import { isoDay, request } from "../http";
import type { DailyCost, DailyCostAdapter } from "../types";

interface FocusCharge {
  BilledCost: number | string;
  BillingCurrency: string;
  ChargeCategory: string;
  ChargePeriodStart: string;
  ServiceName: string;
}

export const vercelAdapter: DailyCostAdapter = {
  id: "vercel",
  mode: "daily",
  label: "Vercel",
  keyHelp: "vercel.com/account/settings/tokens: create a token with access to the team. Needs Owner, Member, Developer, Billing or Viewer role. Plan fees sync too, so don't add your Vercel plan as a subscription.",
  fields: [
    { name: "apiKey", label: "Access token", secret: true, required: true },
    { name: "teamId", label: "Team ID or slug", secret: false, required: false, placeholder: "team_... (blank for a personal account)", help: "Team Settings > General > Team ID." },
  ],

  async fetchDailyCosts({ secret, config, window, fetch }) {
    const params = new URLSearchParams({ from: window.from.toISOString(), to: window.to.toISOString() });
    const team = config.teamId?.trim();
    if (team) params.set(team.startsWith("team_") ? "teamId" : "slug", team);
    const response = await request(fetch, `https://api.vercel.com/v1/billing/charges?${params}`, {
      headers: { authorization: `Bearer ${secret}`, accept: "application/jsonl" },
    }, "Vercel");
    const costs: DailyCost[] = [];
    for (const line of (await response.text()).split("\n")) {
      if (!line.trim()) continue;
      const charge = JSON.parse(line) as FocusCharge;
      const category = charge.ChargeCategory === "Usage" ? "" : ` (${charge.ChargeCategory.toLowerCase()})`;
      const name = `${charge.ServiceName}${category}`;
      costs.push({
        date: isoDay(new Date(charge.ChargePeriodStart)),
        key: name,
        amount: Number(charge.BilledCost),
        currency: (charge.BillingCurrency || "USD").toUpperCase(),
        description: `Vercel ${name}`,
      });
    }
    return costs;
  },
};
