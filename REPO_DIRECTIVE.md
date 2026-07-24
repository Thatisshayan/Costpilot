# Costpilot — REPO_DIRECTIVE

> Goal-layer constitution. `REPO_RULES.md` is the law; this is the mission. Every
> task MUST carry `traces-to:` to a Phase/Sprint/Epic. Orphan tasks rejected by CI
> (scripts/verify.sh → directive-lint) and by Sentinel.

## Vision

Costpilot is an AI-powered cloud cost-tracking and budget platform: monitor multi-provider
spend, get intelligent insights, and automate optimization across projects. North-star:
one trustworthy source of truth for cloud spend (API-first OpenAPI spec) with zero
supply-chain or auth regressions, shipping web + mobile from a single typed monorepo.

## Non-Goals

- NOT a general cloud management tool (only cost tracking + insights + optimization).
- NOT adding payment/billing beyond Stripe (no new processors without Shayan approval).
- NOT relaxing pnpm `minimumReleaseAge` supply-chain guard.
- NOT generating API code by hand — Orval from OpenAPI is the only source of types/hooks.
- NOT storing secrets in repo; Clerk/Stripe/OpenAI keys via .env (gitignored).

## Phases

### P1 — Monorepo Foundations (CURRENT)
  exit criteria: codegen green; Drizzle push clean; typecheck passes all packages.
### P2 — Insight Engine
  exit criteria: OpenAI insights endpoint live + tested; cost-anomaly detection.
### P3 — Mobile GA
  exit criteria: Expo 56 app feature-complete vs web dashboard.

## Sprints

### S1 (maps to P1) — stabilize the toolchain
  goal: codegen + db push + typecheck reliable in CI.
### S2 (maps to P2) — AI insights
  goal: insights endpoint with Zod-validated I/O.

## Epics / Chapters

### E1 — API-First Core (maps to P1)
  OpenAPI spec = source of truth; Orval + Zod generated, never hand-edited.
### E2 — Data & Auth (maps to P1)
  Drizzle schema + Clerk auth correct and migration-safe.
### E3 — AI Insights (maps to P2)
  OpenAI cost insights, anomaly detection.

## Tasks

- [ ] T1 — Make CI run codegen + typecheck across all workspaces | traces-to: P1/S1/E1 | acceptance: PR fails if generated types drift from spec
- [ ] T2 — Add Drizzle migration safety check (push vs generate diff) to CI | traces-to: P1/S1/E2 | acceptance: schema drift blocked before merge
- [ ] T3 — Implement insights endpoint (OpenAI) with Zod I/O + tests | traces-to: P2/S2/E3 | acceptance: endpoint returns validated insight; 401 without Clerk
- [ ] T4 — Add hot-reload dev script for api-server (currently build+start only) | traces-to: P1/S1/E1 | acceptance: `pnpm dev` hot-reloads api-server
- [ ] T5 — Verify Clerk auth on every protected route (web + mobile) | traces-to: P1/S1/E2 | acceptance: unauthenticated request → 401 on all protected paths

## Sentinel Constraints

- auto-approve: codegen/tests/docs tasks tracing to P1/E1 with acceptance met.
- review-required: auth (Clerk), Stripe webhooks, OpenAI calls, schema migrations.
- locked: `main`; `lib/db/src/schema/` migrations need Shayan; secrets never.
