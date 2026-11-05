# Market research — cloud, AI and SaaS cost management (2026-11-05)

**Purpose:** guide CostPilot's roadmap, not copy competitors.

**Evidence labels:**
- **[V]** vendor documentation
- **[S]** search summary (third-party, may be stale)
- **[I]** inference

Several vendor sites (vantage.sh, docs.cloudzero.com) were blocked from the agent environment, so most competitor facts are [S]. Verify prices on the live pages before relying on them.

## Products reviewed

| Product | Buyer | Pricing (entry) | Notable capabilities | Fit for small teams |
|---|---|---|---|---|
| Vantage | Dev-led teams, startup to enterprise [S] | Free up to ~$2.5k/mo tracked spend; Pro ~$30/mo; Business ~$200/mo [S, sources conflict] | Cost reports, budgets, forecasts, anomalies, Kubernetes, virtual tags, ~31 integrations including OpenAI/Anthropic [S]; AWS via read-only cross-account role + External ID [S/V blog]; SOC 2 Type 2 [S] | Closest competitor; tiers capped by tracked spend |
| CloudZero | Mid/enterprise SaaS, AWS-heavy [S] | Quote; ~$5k+/mo reported [S] | Unit economics, AI Hub (OpenAI/Anthropic), Kubernetes, ML anomalies [S] | Too heavy and costly |
| Finout | Enterprise FinOps [S] | ~$2k/mo entry, flat annual by spend [S/V pricing.md] | "MegaBill" multi-source bill; virtual tags; shared-cost rules; anomaly alerts to Slack/email [S] | Priced out |
| CloudHealth (Broadcom) | Enterprise, MSPs [S] | % of spend (~1.85–4%) [S] | Rightsizing, RI/Savings Plans, policy engine [S] | Irrelevant; source of dissatisfied customers [I] |
| AWS Cost Explorer / Budgets / Anomaly Detection | Every AWS customer | Console free; API $0.01 per request; Budgets free without actions; anomaly detection free, needs ≥10 days of history [V] | Native AWS views | Free baseline: AWS only, no AI-API/SaaS/multi-currency view [I] |
| OpenAI Costs API | AI API users | — | `/v1/organization/costs` daily buckets by project/key; needs an **admin key** [S]; read-only admin keys reported but not confirmed on OpenAI docs [S] | Integration candidate |
| Anthropic Usage & Cost API | Organisations (not individual accounts) [V] | — | Usage report (1m/1h/1d) and cost report (daily, USD) [V]; Console admin keys **have no scopes and carry full admin access** [V] | Integration candidate with a heavy trust ask |
| Helicone, Langfuse, Portkey | AI app developers | Free tiers; ~$29–79/mo paid [S] | Per-request cost via a proxy/gateway or tracing [S] | Adjacent; sit in the production request path |
| Cledara, Zylo, Vendr | SaaS spend management | Cledara ~£100–200/mo; Zylo/Vendr mid/enterprise [S] | Subscription discovery via card/SSO data, renewals [S] | Adjacent for SaaS subscriptions |
| FinOps Foundation | Neutral reference | — | 2025 framework adds AI and SaaS scopes; FOCUS 1.2 adds SaaS, 1.3 adds allocation and commitment data [V/S]; State of FinOps 2026: 98% manage AI spend, 90% SaaS [S] | Use FOCUS concepts in our data model |

## Customer problems for dev teams and SMB SaaS (ranked) [I, supported by FinOps survey data]

1. **"What are we spending in total?"** Spend is spread across cloud bills, AI consoles and card-paid SaaS, in several currencies.
2. **Fast-growing, volatile AI API spend** that is hard to attribute to a product or team.
3. **Surprise bills** discovered too late.
4. **Attribution:** which project or team drove the cost.
5. **Monthly close:** reconciling refunds, credits and currencies for finance.
6. **Renewals and unused subscriptions.**

## Table stakes vs differentiators

**Table stakes:**
- low-friction read-only connections;
- daily spend by provider, service and project;
- budgets with alerts;
- month-to-date and end-of-month view;
- CSV export and reports;
- roles;
- a credible security posture (SOC 2 in progress at minimum).

**Differentiators in the market:**
- virtual tags and rule-based allocation;
- ML anomaly detection;
- unit economics;
- Kubernetes allocation;
- commitment optimisation;
- multi-source normalisation (FOCUS);
- gateway-level AI cost.

## Common workflows

| Workflow | Steps |
|---|---|
| Connect | Read-only role, key or export; backfill; first dashboard within hours |
| Allocate | Map accounts, tags or keys to projects; rules for unallocated spend |
| Monthly review | Month-over-month by project and vendor; explain variance; export to finance |
| Budget alert | 50/80/100% threshold; notify owner; investigate |
| Anomaly triage | Spike; drill down; assign; annotate |
| Showback | Per-team report |
| Renewal | Contract and renewal calendar; review 30–60 days ahead |

## Where CostPilot can credibly differentiate [I]

- **One ledger** for cloud, AI APIs and SaaS subscriptions, sized for teams under ~$50k/month.
- **Honest multi-currency:** original currency kept, never silently converted. Competitors are USD-centric, and the Anthropic cost API is USD-only.
- **Provenance on every line:** manual, import or provider, with duplicate-safe reconciliation when manual entries overlap imported data.
- **Light rule-based allocation:** vendor, key or account mapped to a project.
- **Simple deterministic budgets and renewal reminders** before any ML.
- **Flat, low pricing.**

**Not to attempt early:** ML anomaly detection, Kubernetes allocation, commitment optimisation, write automation, an AI proxy, card-feed SaaS discovery, full FOCUS compliance.

## First provider integration

| Option | Value | Security | Effort |
|---|---|---|---|
| AWS Cost Explorer (designed: `docs/design/AWS_COST_INTEGRATION_V1.md`) | High coverage among SaaS teams [I] | Best: least-privilege role with External ID, no stored secret | Medium; needs a CostPilot AWS account; API billed per request |
| OpenAI Costs API | High differentiation (AI is the top FinOps priority) | Admin key; read-only reported [S] | Low–medium |
| Anthropic Cost API | High differentiation | Weak: Console admin keys are unscoped full access [V] | Low–medium |
| CSV import of provider console exports | Bridges all providers with zero credentials | Best | Low; builds on the import work in the backlog |
| GCP/Azure exports | Medium | Reader roles on an export | Medium–high; customer setup needed |

**Recommendation:**
1. First, ship the CSV import with provenance and duplicate prevention. That needs no credentials and serves every provider.
2. The first live integration stays an owner decision between AWS (best security model, already designed) and OpenAI (best AI differentiation, if a read-only key is confirmed).
3. Anthropic follows only with explicit warnings about its key privileges.

## Security and privacy expectations of buyers

- SOC 2 Type II, or in progress with a security page.
- Read-only least-privilege access; no long-lived cloud keys.
- Credentials encrypted at rest (KMS/envelope encryption).
- SSO (OIDC; SAML at higher tiers) and role-based access.
- An audit log of connections, role changes and exports.
- Retention and deletion on disconnect; DPA/GDPR; an EU residency option.
- A clear statement that no write or spend actions are ever taken.

## Sources

Vantage: vantage.sh/pricing, nops.io/blog/vantage-pricing-explained, vantage.sh/llms.txt, docs.vantage.sh/connecting_aws · CloudZero: rfp.wiki, AWS Marketplace listing, docs.cloudzero.com/docs/connecting-to-openai · Finout: finout.io/hubfs/pricing.md, docs.finout.io · CloudHealth: finout.io blog, comparedge.com, vmware.com solution overview · AWS: aws.amazon.com/aws-cost-management (Cost Explorer and Budgets pricing), anomaly detection blog · OpenAI: community.openai.com Usage API announcement and 404 thread, sumologic.com OpenAI source docs · Anthropic: platform.claude.com/docs/en/manage-claude/usage-cost-api and /admin-api-keys · Helicone: truefoundry.com · Langfuse: langfuse.com docs and pricing · Portkey: portkey.ai docs · Cledara/Zylo: toolradar.com, capterra · FinOps Foundation: finops.org framework poster 2025, finops.org/framework/scopes, FOCUS 1.3 announcement, State of FinOps 2026 summaries.
