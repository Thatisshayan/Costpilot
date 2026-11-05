# Hosting options — staging and production (RECOMMENDATION, NOT APPROVED)

Status: 2026-11-05. **Nothing is provisioned or purchased.** Hosting provider, region and budget need Shayan's approval (Rule 24). Prices are monthly USD. **Verified** = read on 2026-11-05 from the vendor's own official documentation source (several vendors publish their docs in public GitHub repositories; the vendor websites themselves were blocked from the agent environment). **Unverified** = search summaries only; confirm on the live pricing page before budgeting.

## GitHub Pages is not suitable for the commercial app

GitHub's Pages limits page says Pages is not allowed to be used "to run your online business … or providing commercial software as a service (SaaS)" ([GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)). The current Pages target is acceptable only as a demo. Moving off it means changing the Vite base path from `/Costpilot/` to `/` and updating `ALLOWED_ORIGINS`, Clerk origins and the runbook together.

## Architectures compared (staging + production)

| Stack | Pilot-scale | Production-grade (HA API, 7-day PITR) | Growth (3× API, 10 GB DB) | Prices | DB restore window | Canada |
|---|---|---|---|---|---|---|
| **A. Cloudflare Pages + Fly.io API + Neon Postgres** | **≈ $31** | **≈ $57** | ≈ $68–71 | Verified (except Sentry paid tier) | 1 day default; 7 days configurable | No (Neon) |
| B. Cloudflare Pages + Fly.io API + Fly Managed Postgres | ≈ $49–87 | ≈ $56–94 (staging DB on Neon Free vs a second Fly Postgres) | ≈ $66–138 | Verified | PITR exists; window not documented | Yes (Toronto) |
| C. Cloudflare Pages + Railway (API + Postgres) | ≈ $20–30 | unverified | ≈ $45–60 | Unverified | PITR exists; window unverified | No |
| D. Render (static + web service + Postgres) | ≈ $41–66 | unverified | ≈ $81–135 | Unverified | 7 days on Pro (unverified) | No |
| E. DigitalOcean App Platform + Managed Postgres | ≈ $39–47 | unverified | ≈ $78–90 | Unverified | 7 days (unverified) | Toronto region exists; DB availability unverified |

Supabase as the database only was also reviewed: Pro is $25/month but point-in-time recovery is a $100/month add-on (verified), and its auth duplicates Clerk — not recommended.

## Recommendation: Stack A, sized production-grade

| Item | Configuration | Monthly | Status |
|---|---|---|---|
| Web (prod + staging) | Cloudflare Pages / Workers static assets, custom domain, TLS | $0 (static requests free and unlimited) | Verified |
| API production | Fly.io, 2 × shared-cpu-1x 1 GB in `iad` (rolling deploys, no single machine) | $13.40 | Verified |
| API staging | Fly.io, 1 × shared-cpu-1x 512 MB | $3.69 | Verified |
| Egress | ~10 GB | $0.20 | Verified ($0.02/GB) |
| PostgreSQL production | Neon Launch, 0.5 CU always on, ~1 GB data, **history window set to 7 days** | ≈ $39 | Verified unit prices ($0.106/CU-hour, $0.35/GB, $0.20/GB history) |
| PostgreSQL staging | Neon Free plan | $0 | Verified |
| Off-site backup | Nightly `pg_dump` to object storage (e.g. Cloudflare R2), restore rehearsed monthly | ≈ $0–1 | Unverified (R2 pricing not checked) |
| Monitoring | Sentry Developer (free) plus Fly log search (7-day, free in beta) | $0 | Verified (Sentry Team base price unverified) |
| Secrets | Fly secrets for server values (DB URL, Clerk secret, webhook secret, encryption master key); Cloudflare build variables for public keys only | $0 | Verified features |
| **Total** | | **≈ $57/month** (≈ $83 if a paid Sentry plan ≈ $26 is added — unverified) | |

Pilot-scale alternative: one 1 GB API machine and Neon at 0.25 CU ≈ $31/month, acceptable for a controlled private pilot but without API redundancy.

Why A: cheapest fully verified option; Docker + standard PostgreSQL (low lock-in); Fly holds SOC 2 Type 2; Neon holds SOC 2 Type 1/2, SOC 3 and ISO 27001/27701 (HIPAA only on Neon Scale); Neon branches let restores land in an isolated copy, matching the runbook's "never restore over live" rule; Fly's shutdown timeout (`kill_timeout`, up to 300 s) covers the API's 20 s drain.

Region: US-East (Fly `iad`, Neon `aws-us-east-1`) by default. If Canadian data residency is required, use Stack B in Toronto and confirm Fly Managed Postgres's restore window with Fly first. If enterprise customers require the database vendor's compliance reports or a 30-day restore window, move production to Neon Scale (≈ +$21–42/month).

Encryption-key custody: the production encryption master key must be generated once, stored in Fly secrets, and escrowed offline by the owner; it must never be regenerated for an existing database.

## Still unverified (allow these hosts in the agent environment to check)

Railway (`railway.com`, `docs.railway.com`), Render (`render.com`), DigitalOcean (`www.digitalocean.com`), Fly Managed Postgres restore window (`fly.io`), Sentry plan prices (`sentry.io`), Cloudflare R2 pricing and terms (`www.cloudflare.com`).

## Decisions needed

1. Approve moving the commercial web host off GitHub Pages (recommend Cloudflare Pages).
2. Choose region (recommend US-East unless Canadian residency is required).
3. Approve a monthly budget ceiling (recommend $100/month for staging + production during the pilot).
4. Confirm backup retention target (recommend 7-day PITR plus 30 days of nightly off-site dumps).
