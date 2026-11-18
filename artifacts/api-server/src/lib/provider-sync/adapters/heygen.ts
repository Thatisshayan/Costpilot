// HeyGen: GET /v3/users/me (x-api-key). There is no cost history, so spend is derived from
// readings: a USD wallet balance going down, or usage-based "spending_current_usd" going up.
// Credit subscriptions report credits, not money; track the plan as a subscription instead.
import { getJson } from "../http";
import { ProviderError, type CounterAdapter } from "../types";

interface CurrentUser {
  data: {
    billing_type: "wallet" | "subscription" | "usage_based";
    wallet?: { currency: string; remaining_balance: number } | null;
    usage_based?: { spending_current_usd: number } | null;
  };
}

export const heygenAdapter: CounterAdapter = {
  id: "heygen",
  mode: "counter",
  label: "HeyGen (API wallet)",
  keyHelp: "app.heygen.com > Settings > API: copy the API key. Works for USD wallet or usage-based billing. A credit subscription has no dollar figures: add the plan as a subscription instead.",
  fields: [{ name: "apiKey", label: "API key", secret: true, required: true }],

  async readCounter({ secret, fetch }) {
    const { data } = await getJson<CurrentUser>(fetch, "https://api.heygen.com/v3/users/me", { "x-api-key": secret }, "HeyGen");
    if (data.billing_type === "wallet" && data.wallet) {
      if (data.wallet.currency.toLowerCase() !== "usd") {
        throw new ProviderError("This HeyGen wallet is in credits, not USD; track the plan as a subscription instead.");
      }
      return { metric: "wallet_balance_usd", value: Number(data.wallet.remaining_balance), currency: "USD", kind: "balance", description: "HeyGen API usage" };
    }
    if (data.billing_type === "usage_based" && data.usage_based) {
      return { metric: "period_spend_usd", value: Number(data.usage_based.spending_current_usd), currency: "USD", kind: "spend", description: "HeyGen API usage" };
    }
    throw new ProviderError("This HeyGen account uses a credit subscription, which has no dollar amounts to sync. Add the plan under Subscriptions instead.");
  },
};
