# AWS cost integration — v1 design (PROPOSED, NOT APPROVED)

Status: design only, 2026-11-05. **No AWS resources, credentials or integration code exist.** Implementation requires Shayan's approval of this design and of the open decisions below (Rule 24 for any spend). The simulated adapters in `artifacts/api-server/src/lib/sync-engine.ts` are not reused and stay disabled.

Evidence labels: **Verified** = read from AWS-authored sources available to the agent on 2026-11-05 (botocore service models for Cost Explorer, Data Exports, STS and Organizations; AWS Cloud Intelligence Dashboards templates; AWS IAM/CUR guides on GitHub, which AWS archived in 2023 and may be stale). **Unverified** = must be confirmed on docs.aws.amazon.com / aws.amazon.com before build (those hosts were blocked from the agent environment).

## 1. Why AWS first

- Customers grant a **read-only cross-account IAM role**; CostPilot never stores a customer secret. OpenAI's and Anthropic's cost APIs require full organization admin keys with no read-only scope (verified from OpenAI's official API spec and Anthropic's docs), which is a worse security boundary.
- Cost Explorer needs no customer-side data pipeline (unlike GCP's BigQuery export or AWS Data Exports), so onboarding is one CloudFormation stack.
- Bedrock (AI) spend appears in the same AWS billing data, which fits the cloud-plus-AI positioning.

## 2. Access model

| Topic | Design | Evidence |
|---|---|---|
| Where the role lives | The customer's **payer (management) account** for organization-wide spend. A member-account role sees only that account; v1 accepts it but labels the connection "partial visibility". | Verified (stale guide) |
| Trust | Role trusts CostPilot's dedicated connector principal and requires `sts:ExternalId`. | Verified (API model) |
| External ID | Generated server-side per connection (e.g. `cp-<hash(workspace)>-<128-bit random>`), 2–1224 chars, never accepted from client input, immutable for the connection. | Verified length/pattern; AWS guidance (stale) |
| Confused-deputy check | Before activating, CostPilot calls AssumeRole **with and without** the External ID; if the call without it succeeds, the role ARN is rejected. | AWS guidance (stale) |
| Permissions (v1) | `ce:GetCostAndUsage`, `ce:GetDimensionValues`, optional `ce:GetCostForecast`; `Resource: "*"`. | Actions verified; resource-level support unverified |
| Session | `RoleSessionName = costpilot-<workspaceId>-<syncRunId>` so customers can audit calls in CloudTrail; 1-hour sessions; credentials held in memory for one run only. | Verified (STS model) |

Trust policy installed by the customer (CloudFormation/Terraform template provided by CostPilot):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::<COSTPILOT_ACCOUNT_ID>:root" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "sts:ExternalId": "<PER_CONNECTION_EXTERNAL_ID>" },
      "ArnEquals": { "aws:PrincipalArn": "arn:aws:iam::<COSTPILOT_ACCOUNT_ID>:role/costpilot-aws-connector" }
    }
  }]
}
```

Permissions policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ce:GetCostAndUsage", "ce:GetDimensionValues", "ce:GetCostForecast"],
    "Resource": "*"
  }]
}
```

**A dedicated CostPilot AWS account is required.** Something must be the trusted principal that calls `sts:AssumeRole`. Its own cost is near zero (IAM and STS are free; CloudTrail's first management trail is free; a budget alarm is free up to AWS's free-budget allowance — unverified), but it is still an account with a payment method, root-account custody, MFA and CloudTrail, so it needs approval. The API host also needs an AWS identity to call STS: options are a narrowly scoped access key stored in the host's secret store, IAM Roles Anywhere / OIDC federation, or running the sync worker on AWS compute.

## 3. Data access and accuracy

- **v1 source: Cost Explorer `GetCostAndUsage`** — DAILY granularity, `GroupBy` SERVICE + LINKED_ACCOUNT (max two group-bys, verified), metrics UnblendedCost, AmortizedCost and NetUnblendedCost (all stored; Unblended shown by default). A second pass grouped by RECORD_TYPE separates usage from credits, refunds and tax, which map onto CostPilot's existing refund/credit labelling. Each period carries an `Estimated` flag (verified).
- **Latency/restatement:** month-to-date data is estimated and can change until the invoice, and refunds/credits can change it later (stale guide). Every sync re-fetches from the 1st of the previous month to today and replaces that window per connection/day in one transaction.
- **History:** backfill depth is an owner decision; 13 months is the commonly cited Cost Explorer default (unverified).
- **Currency:** stored per row exactly as reported (`Unit`); never converted or summed across currencies (existing CostPilot policy). Behaviour for non-USD invoicing entities is unverified.
- **Precision:** provider rows use `numeric(20,10)`; the existing `expenses.amount numeric(10,2)` is too coarse for AWS line amounts, which is one reason provider data gets its own tables.
- **v2 (later): AWS Data Exports (CUR 2.0 or FOCUS 1.2)** to a customer-owned S3 bucket for resource/tag detail and invoice-final flags; refreshed up to three times daily (verified API model). Adds S3 read permissions scoped to the export prefix.

## 4. Storage model

New tables (provider data never mixes with manual `expenses`):

| Table | Key columns |
|---|---|
| `provider_connections` | id, workspace_id, provider='aws', status (`pending`/`active`/`error`/`revoked`/`disabled`), role_arn (unique across workspaces), aws_account_id (from GetCallerIdentity), external_id (unique, immutable), is_payer, last_sync_at, last_error, created_by |
| `provider_cost_daily` | connection_id, workspace_id, usage_date, linked_account_id, service, record_type, unblended, amortized, net_unblended (`numeric(20,10)`), currency, is_estimated, fetched_at, sync_run_id — **unique (connection_id, usage_date, linked_account_id, service, record_type)**, upserted |
| `provider_accounts` | connection_id, linked_account_id, name, last_seen |
| `sync_runs` | id, connection_id, kind (`validate`/`backfill`/`incremental`/`manual`), range, requests_made, pages, status, error_code, started/finished |

No secret is stored (the External ID is not a secret; there are no keys). Every query is scoped by `workspace_id` and connection id; a guessed connection id from another workspace returns 404, matching the existing authorization model. Dashboards show provider spend and manual expenses as separately labelled sources and warn when a manual AWS expense overlaps a connected account's month.

## 5. Sync, errors and operations

- **Schedule:** once daily plus a rate-limited manual refresh; single-runner job with a per-connection lock (the existing cron service is not reused because it was designed for the simulated adapters).
- **States surfaced to users:** pending validation, active, delayed (data not yet available), error (with reason), revoked (stack deleted / AccessDenied), disabled.
- **Errors handled:** `LimitExceededException` (backoff), `RequestChangedException` (restart pagination), `DataUnavailableException` (new account), `BillExpirationException`, `AccessDenied` (auto-disable after N consecutive failures, mark revoked).
- **Kill switches:** global `AWS_SYNC_ENABLED=false` (default off), per-connection disable.
- **Audit log:** connect, validate, rotate External ID, disable, delete, every sync run.
- **Cost of API calls:** Cost Explorer is about **$0.01 per paginated request** (unverified), billed to the account the request is made against — likely the customer's (unverified; must be disclosed during onboarding). Rough estimate for a daily sync grouped by service and account: ~$0.30–3 per customer per month; a 13-month backfill ~$0.15–4 one-off, depending on account count (estimate). `sync_runs.requests_made` makes this visible per tenant.
- **Rate limit:** roughly 5 requests/second per account (unverified); runs are paced accordingly.

## 6. Security threats and mitigations

| Threat | Mitigation |
|---|---|
| Confused deputy (another tenant uses a victim's role ARN) | Server-generated per-connection External ID; ARN unique across workspaces; without-ID AssumeRole check |
| Credential leakage | No customer keys at all; STS credentials in memory for one run; never logged |
| Over-privileged role | Template grants only Cost Explorer read actions; reviewed in onboarding UI |
| Cross-tenant data access | Workspace-scoped queries; existing authorization tests extended to provider endpoints |
| CostPilot account compromise | Dedicated account, MFA, no console users for daily work, CloudTrail, STS-only permissions for the connector principal |
| Runaway API charges | Per-run page cap, manual-refresh rate limit, per-tenant monthly request budget alarm |
| Misleading numbers | Estimated flag shown; restatement window; no simulated or fabricated rows ever |

## 7. Implementation milestones (after approval)

| Milestone | Scope | Acceptance tests | Estimate |
|---|---|---|---|
| M0 Verify | Confirm every "unverified" item on AWS's live docs; create the CostPilot AWS account (approved spend) | Checklist signed off | 1–2 days |
| M1 Schema + API contract | 4 tables + migration (with duplicate/guard rehearsal), OpenAPI endpoints, generated clients | Migration rehearsal; contract diff; cross-tenant 404 tests | 2 days |
| M2 Connector | STS + Cost Explorer client, pagination, retries, error mapping | Fixture tests: multi-page, estimated periods, credits/refunds/tax negatives, each AWS error, no credentials in logs | 2.5 days |
| M3 Onboarding | External ID issue, CloudFormation/Terraform templates, validation incl. without-ID check, status UI | ExternalId never accepted from client; validation refuses a misconfigured trust policy (mocked STS) | 3 days |
| M4 Sync | Daily + manual sync, restatement window, idempotent upsert, kill switches, audit log | Same fixture twice → identical rows; restated day updates; disappearing group removed; kill switch stops runs | 2.5 days |
| M5 Reporting | Provider vs manual sources in dashboard/exports, metric toggle, overlap warning | Per-currency totals unchanged for manual data; provider totals match fixtures to the cent | 2 days |
| M6 Sandbox E2E | Owner-approved sandbox payer account; compare 3 days and one month with the AWS console (<1% tolerance); delete stack → revoked | Recorded evidence and audit (Rule 6) | 1.5 days |

Total ≈ 15 engineer-days for v1 (Cost Explorer only); Data Exports v2 ≈ +8–12 days.

## 8. Decisions needed before implementation

1. Approve creating a dedicated CostPilot AWS account (Rule 24) and how the API host obtains its AWS identity.
2. Cost Explorer charges: disclose that they land on the customer's bill (after verifying) or absorb them.
3. Payer-account requirement vs also allowing member-account connections with a partial-visibility label.
4. Default metric (recommend Unblended, with Amortized available) and backfill depth.
5. Data on disconnect: retain or delete provider rows (deletion is a Rule 14 decision).
6. Allow `docs.aws.amazon.com` and `aws.amazon.com` in the agent environment so M0 can verify the open facts.
