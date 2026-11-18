// AWS: Cost Explorer GetCostAndUsage (us-east-1 endpoint), daily UnblendedCost by SERVICE.
// AWS bills each request (about $0.01), so scheduled syncs run once a day. Needs an IAM user
// limited to ce:GetCostAndUsage. Signed with lib/provider-sync/sigv4.ts (no AWS SDK).
import { isoDay, request } from "../http";
import { signRequest, type AwsCredentials } from "../sigv4";
import { ProviderError, type DailyCost, type DailyCostAdapter } from "../types";

const ENDPOINT = "https://ce.us-east-1.amazonaws.com/";
const MAX_PAGES = 20;

interface CostAndUsage {
  ResultsByTime: Array<{
    TimePeriod: { Start: string };
    Groups?: Array<{ Keys: string[]; Metrics: { UnblendedCost: { Amount: string; Unit: string } } }>;
  }>;
  NextPageToken?: string;
}

function parseCredentials(secret: string): AwsCredentials {
  try {
    const parsed = JSON.parse(secret) as Partial<AwsCredentials>;
    if (parsed.accessKeyId && parsed.secretAccessKey) return parsed as AwsCredentials;
  } catch { /* fall through */ }
  throw new ProviderError("AWS needs both an access key ID and a secret access key.");
}

export const awsAdapter: DailyCostAdapter = {
  id: "aws",
  mode: "daily",
  label: "AWS (Cost Explorer)",
  keyHelp: "IAM > Users > create a user with only the ce:GetCostAndUsage permission, then create an access key for it. Cost Explorer must be enabled in Billing. Each sync costs about $0.01, so it runs once a day.",
  minIntervalHours: 24,
  fields: [
    { name: "accessKeyId", label: "Access key ID", secret: true, required: true, placeholder: "AKIA..." },
    { name: "secretAccessKey", label: "Secret access key", secret: true, required: true },
  ],

  async fetchDailyCosts({ secret, window, fetch }) {
    const credentials = parseCredentials(secret);
    const costs: DailyCost[] = [];
    let token: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const body = JSON.stringify({
        TimePeriod: { Start: isoDay(window.from), End: isoDay(window.to) },
        Granularity: "DAILY",
        Metrics: ["UnblendedCost"],
        GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
        ...(token ? { NextPageToken: token } : {}),
      });
      const headers = signRequest({
        method: "POST", url: ENDPOINT, region: "us-east-1", service: "ce", body, credentials,
        headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": "AWSInsightsIndexService.GetCostAndUsage" },
      });
      const response = await request(fetch, ENDPOINT, { method: "POST", headers, body }, "AWS");
      const result = await response.json() as CostAndUsage;
      for (const day of result.ResultsByTime) {
        for (const group of day.Groups ?? []) {
          const service = group.Keys[0] ?? "Other";
          costs.push({
            date: day.TimePeriod.Start,
            key: service,
            amount: Number(group.Metrics.UnblendedCost.Amount),
            currency: (group.Metrics.UnblendedCost.Unit || "USD").toUpperCase(),
            description: `AWS ${service}`,
          });
        }
      }
      if (!result.NextPageToken) return costs;
      token = result.NextPageToken;
    }
    throw new ProviderError(`AWS returned more than ${MAX_PAGES} pages; narrow the sync window.`);
  },
};
