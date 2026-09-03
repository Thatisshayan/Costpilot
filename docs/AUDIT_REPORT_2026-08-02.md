# Costpilot — Comprehensive Codebase Audit

- **Date:** 2026-08-02
- **Agent:** opencode
- **Branch:** `agent/opencode/audit-2026-08-02`
- **Scope:** Full-repository audit (architecture, code quality, security, dependencies & supply chain, tests & CI, performance & scalability, risks & tech debt, strengths)
- **Method:** Code inspection, prior-audit comparison (per Rule 5), governance-doc review (REPO_RULES, REPO_DIRECTIVE, GROUND-TRUTH, DEFERRED_WORK). **No application code was modified.** Pre-existing uncommitted changes to `scripts/verify.sh`, `scripts/verify.ps1`, and untracked `scripts/gate.yml` were left untouched (Rule 18).
- **Prior audit consulted:** `audits/2026-07-23_Hermes_GovernanceBootstrap_Audit.md`.

---

## 1. Architecture Overview

**Costpilot** is an AI-powered cloud-cost tracking and budget-management platform. It is a **pnpm-workspace TypeScript monorepo** (OpenAPI-first, code-generating) that ships a REST API server, a web dashboard, and an Expo mobile app from a single typed source tree.

### Topology

```
costpilot/
├── lib/                      # Shared, workspace-internal packages
│   ├── api-spec/             # OpenAPI 3.1 spec (openapi.yaml, 1770 lines) — SOURCE OF TRUTH
│   ├── api-zod/              # Orval-generated Zod schemas + types (src/generated/)
│   ├── api-client-react/     # Orval-generated React Query hooks + custom fetch client
│   └── db/                   # Drizzle ORM schema (13 modules), migrations, client
├── artifacts/
│   ├── api-server/           # Express 5 REST API (esbuild build), Dockerfile
│   ├── ai-tracker/           # React 19 + Vite 7 + Tailwind 4 web dashboard (shadcn/ui)
│   └── mobile-app/           # Expo SDK 56 + React Native 0.85 app (expo-router)
├── .github/workflows/        # ci.yml, ci-api-server.yml, deploy.yml, gate.yml
├── docker-compose.yml        # postgres 16 + redis 7 + api-server (dev)
├── railway.json / railway.staging.json
└── docs/ + audits/ + scripts/  # Governance, CI gate, audits
```

### Contract generation pipeline (API-first intent)
`lib/api-spec/openapi.yaml` → **Orval** (`lib/api-spec/orval.config.ts`) → two generated packages:
- `@workspace/api-zod` — Zod validation schemas + canonical TS types (`src/generated/api.ts`, 61 type files).
- `@workspace/api-client-react` — React Query hooks (`src/generated/api.ts`, 4381 lines) + hand-written `custom-fetch.ts` and `workspace-hooks.ts`.

### Runtime architecture (API server)
Express app in `artifacts/api-server/src/app.ts` assembles layered middleware:
`helmet` → global rate limiter → pino-http logging (query-string stripping) → CORS (allow-list) → cookie-parser → JSON body (1MB) → raw-body capture for stripe/clerk webhooks → CSRF (double-submit) → `/api` mounted with `requireAuth` → route router → centralized error handler.

### Data layer
Drizzle ORM against PostgreSQL 16. `lib/db/src/index.ts` builds a `Pool` + `drizzle()` client gated on `DATABASE_URL`. ~17 tables across 13 schema modules: workspaces, workspace_members, platforms, projects, expenses, subscriptions, tools, credit_purchases, webhooks, cicd (deployment_policies, pipeline_runs), remediation, ai_audits, budget_policies. Most cost tables carry both `user_id` (Clerk subject) and optional `workspace_id`.

### GitHub Pages deploy
`deploy.yml` builds `ai-tracker` (BASE_PATH=/Costpilot/) and publishes `artifacts/ai-tracker/dist` via Pages, plus Railway targets for the API.

---

## 2. Code Quality & Maintainability

### Strengths
- **Clean monorepo boundaries**: shared packages (`lib/*`) cleanly split contracts (`api-spec`/`api-zod`), client wiring (`api-client-react`), and data (`db`) from deployable apps (`artifacts/*`).
- **Centralized security wiring** in `app.ts`; global Zod-based env validation in `env.ts`.
- **Type strictness** baseline: `tsconfig.base.json` strict + bundler module resolution; project references at root.
- Zero `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck` in the codebase — a genuinely good signal.

### Maintainability debt

| Area | Finding |
|------|---------|
| `any` sprawl | ~36 `any` in api-server, ~81 in ai-tracker (excl tests/generated), e.g. `app.ts:111`, webhook/usage handlers, `workspaces.ts`, `sync-mobile.ts`. `as X` casts: ~183 across server+web. |
| God files | `sync-engine.ts` (754), `reports.tsx` (799), `integrations.tsx` (779), `telemetry.ts` (480), `sidebar.tsx` (727), `mobile index.tsx` (705), `auto-pilot.tsx` (636). |
| Spec/code drift | ~8+ route groups exist in the server but are **not** in `openapi.yaml` (budgets, currency, exports, notifications, provisioning, reports, sync, sync-mobile, receipts-list) — these are hand-authored, typed with `any`, and break the API-first directive. |
| Duplication | 3 copies of workspace-membership check; `sentry.ts` duplicated verbatim in server+tracker (no-op stubs); `formatCurrency` defined 3×; 9× near-identical provider sync blocks in `sync-engine.ts`. |
| Leftover cruft | `routes/__tests__/debug2.test.ts` ("inspect stack", console-log only); `verify_sync.ts` manual console script; stale `.gitkeep` in non-empty `lib`/`middlewares` dirs. |
| Mock surface | Many `ai-tracker` pages (azure-ai, aws-bedrock, gpu-waste, sso, compliance, cost-centers, cicd-integration…) are near pure static/mock UI not wired to any API or to `costpilotMockData.ts`. |
| Error envelope | Inconsistent shapes: `{error}`, `{error,message}`, plain strings. Client must heuristically guess via `getStringField` for title/detail/message/error. |
| Silent failures | `reports.tsx:177` `} catch {}` (fully silent); `auth.ts:55` blanket 401 catch; `isWorkspaceMember` returns false on DB error. |
| Logging split | pino (good, with redaction) in most of server, but `console.log/warn` scattered in `usage-engine.ts` (dumps raw `usageData`), `sentry.ts` stubs, ai-tracker hooks, dev scripts. |
| Generated output | 4381-line god-file `api-client-react/src/generated/api.ts` committed to git (expected for Orval, but adds review noise and is not diffable). |
| 17 env vars | Central Zod schema exists, but most routes use raw `process.env.X` ad hoc and `ALLOWED_ORIGINS` parsing is duplicated inline in `app.ts` instead of `env.ts`. |

---

## 3. Security Posture

### What's solid

- **No committed secrets** found in the tree or current git history (only placeholders/test fixtures). `.env` gitignored; `.gitignore` covers `.env*`, `*.p8`, `*.p12`, `*credential*`.
- **SQL injection:** none found. Drizzle queries are parameterized (builder + `sql\`…\`` only for column refs / bound params). No user-input string concat into SQL.
- **Stripe & Clerk (SVIX) webhook HMAC verification** with `crypto.timingSafeEqual`, 5-min drift window — solid.
- **Rate limiting**: global 300/15min, sensitive 50/15min on webhooks/workspaces/credits/subscriptions/sync, AI scanner 15/hr on scan/upload/query.
- **Validation**: strong per-route Zod; request/response I-O modeled via generated schemas on many endpoints.
- **Body size caps** (1MB JSON, 5MB uploads) — DoS mitigated; helmet headers on. Server 500s obfuscated in production; request logging strips query strings.
- **Supply chain**: pnpm `minimumReleaseAge: 1440` (≥1-day-old packages) in `pnpm-workspace.yaml`.

### Vulnerabilities & weaknesses (ranked)

| # | Sev | Area | Finding | Location |
|---|-----|------|---------|----------|
| 1 | Med | Auth | Clerk webhook at `/api/webhooks/clerk` is effectively **unreachable**: `requireAuth` bypass list omits it while auth is mounted before routes → workspaces signature-verified endpoint never serves real Clerk/Svix traffic. | `middlewares/auth.ts:30`, `app.ts:124`, `webhooks.ts:166` |
| 2 | Med | Auth | Auth token accepted via `?token=` query param → leakage into logs/browser-history/Referer (mitigation: query-stripping serializer, but vector remains). | `middlewares/auth.ts:36-38` |
| 3 | Med | Authz | **Cross-workspace spend attribution**: `telemetry.ts` `/llm-route` & `/chat/completions` take `workspaceId`/`projectId` from body/headers with **no membership verification**, so spend can be attributed to a workspace the caller does not belong to. | `telemetry.ts:141-149,258-263,377-386` |
| 4 | Med | Authz | Multi-workspace isolation is by `userId` only (`.where(eq(…userId, req.userId))`); workspace membership not enforced at the data layer → cross-workspace co-location & broken multi-user collaboration. | `expenses.ts`, `platforms.ts`, `projects.ts`, `subscriptions.ts`, `credits.ts`, `budgets.ts` |
| 5 | Low-Med | Injection | CSV formula-injection guard (`sanitizeCsvField`) present in `analytics.ts` but **missing** in `reports.ts` CSV export. | `reports.ts:87-89` |
| 6 | Low | Secrets | Env-var naming mismatch: env schema `WEBHOOK_SECRET` vs code `CLERK_WEBHOOK_SIGNING_SECRET`. | `lib/env.ts:14` vs `webhooks.ts:167` |
| 7 | Low | Secrets | API keys encrypted with app-level symmetric `ENCRYPTION_KEY`; `encryption.ts` falls back to random key (data undecryptable across restarts). Not real KMS. | `lib/encryption.ts`, `lib/kms-vault.ts` |
| 8 | Low | Webhooks | `/incoming/:provider` shared-secret compare uses non-constant-time `!==` and is not rate-limited. | `webhooks.ts:93` |
| 9 | Low | Input | `templateId` interpolated into `Content-Disposition` filename header (`reports.ts:91,98`). |
| 10 | Low | CORS | `ALLOWED_ORIGINS` optional → prod silently falls back to localhost origins (availability bug, not exposure); with `credentials:true` any wildcard misconfig would be dangerous. | `app.ts:82-99`, `env.ts:18` |
| 11 | Info | Auth | Frontend doesn't wire auth: no Clerk provider in ai-tracker; `setAuthTokenGetter` never called → token-gated API and web dashboard are disconnected in practice. |
| 12 | Info | Cleaning | `maskApiKey` defined but never invoked; `usage-engine.ts` is a "simulation" near-duplicate of the real `webhook-processor.ts`. |

**Auth (legacy):** `@clerk/clerk-sdk-node@5.1.6` in use; `GROUND-TRUTH` flags migration to `@clerk/express` (EOL Jan 2025).

---

## 4. Dependencies & Supply Chain

### Lockfile / hygiene
- **Two lockfiles committed — DRIFT.** `pnpm-lock.yaml` (`lockfileVersion 9.0`, 14,765 lines) is the canonical, fully-populated lock for the whole monorepo. `package-lock.json` is **stale** (956 lines; only root deps; zero express/stripe/drizzle/clerk entries; untouched for commits). This risks a job accidentally installing with npm and diverging.
- pnpm `minimumReleaseAge: 1440` (full-day supply-chain guard) with explicit `minimumReleaseAgeExclude` for `@replit/*`, `stripe-replit-sync`. **This is a strong, unusual supply-chain control.**
- `overrides` pin `esbuild 0.28.0` and replace `@esbuild-kit/esm-loader`→`tsx@^4.21.0` (drizzle-kit provenance fix); `onlyBuiltDependencies`/`allowBuilds` whitelist post-install scripts.
- No `engines.node` declared anywhere.

### Version/duplication findings
- **Node version drift:** 20 (`gate.yml`) vs 22 (workflows, Dockerfile) vs "24+" (README). No single source of truth; gate runs differently than CI.
- **React split:** `react@19.1.0` (catalog, for web) and `react@19.2.3` (mobile) both resolved — catalog comment "expo requires it" only partly true.
- **TypeScript split:** `typescript@5.9.3` and `typescript@6.0.3` (mobile).
- **pdfkit duplicated:** `0.15.2` (api-server) + `0.18.0` (root).
- **README says "Zod v4"** → actual is `zod@3.25.76` (v3). Documentation fact error.
- `pnpm-workspace.yaml` declares `lib/integrations/*` glob that matches nothing (dir doesn't exist) — stale.

---

## 5. Test Coverage & CI

### Test setup (Vitest everywhere)
- Test-capable packages: `api-server`, `ai-tracker` (jsdom), `db` — all `vitest run`.
- `api-server` 13 test files; `lib/db` 6 (schema, kms, clerk-auth, sync-mobile, verify_proxy); `ai-tracker` 3 (dashboard/expenses/settings). **20 test files** total. Mobile and sandbox have **zero** tests.
- **No coverage report**: no `@vitest/coverage`, no coverage collectors → coverage is not measured anywhere.

### CI workflows (.github/workflows)
| File | Triggers → Jobs | Notes |
|------|-----------------|-------|
| `ci.yml` | push/PR to main → typecheck, test (api-server + ai-tracker only), build, security-audit, db-migrate (main-only, effectively no-op) | `pnpm audit … \|\| true` silences failures; **omits `@workspace/db` tests**. Uses `--no-frozen-lockfile`. |
| `ci-api-server.yml` | push/PR main → build-and-test with postgres:16 + redis:7 service containers; runs api-server + db tests | frozen-lockfile (good). |
| `deploy.yml` | push main → codegen, build, tests, ai-tracker build, Pages deploy | **Uses nonexistent `actions/use-action-setup@v4`** (typo; should be `pnpm/action-setup`) → would fail at runtime. `audit …\|\| true`. |
| `gate.yml` | PR to main + non-main push → single `gate` job runs `bash scripts/verify.sh` | Canonical governance gate. |

### Repo-adaptive gate (`scripts/verify.sh` + `verify.ps1`)
Implements the five REPO_RULES gates in one job: `secret-scan` (gitleaks fallback regex + filename scan), `doc-freshness` (README, newest audit <30 days, `docs/_baseline.json` md_count=3), `build`/`test` (repo-adaptive; pnpm), `deploy-dry` (railway → **notice only**, no real dry-run), `directive-lint` (REPO_DIRECTIVE trace).
- `doc-freshness`/`secret-scan`/etc. are collapsed into a single `gate` job, not separate named status checks as REPO_RULES Appendix B implies.
- Node-version drift: gate uses Node 20 + npm cache; everything else Node 22.

### Gaps
- No tests for `api-spec`, `api-client-react`, `api-zod`, `mobile-app`, `mockup-sandbox`.
- No coverage measurement; no e2e/Playwright; no test for the drift between generated schema and actual server bodies.
- `|| true` audit + `|| true` db-migrate masks real failures; gate `deploy-dry` for railway is not executed.

---

## 6. Performance & Scalability

### Risks
- **N+1 in cron anomaly detection** (`cron-service.ts`): loads ALL expenses unbounded, then ~8 queries per flagged cost anomaly (+ remediation inserts). Grows linearly with table size.
- **Unbounded list endpoints**: many `GET` return everything with no `page`/`offset`; some hardcode `.limit(10)/.limit(50)` as magic numbers. Request-driven pagination missing.
- **`/reports/generate`** loads the user's full expense history then `slice(0,20)` *after* fetching everything — unnecessary full pass.
- **Serial/blocking**: `sync-engine` crunches providers in sequence; dashboard summary runs queries serially instead of `Promise.all`.
- **Chunk bloat**: `reports.tsx` (799 lines) and `integrations.tsx` (779) risk large route chunks; GROUND_TRUTH warns largest still >500KB (reduced 2.1MB→928KB previously via `manualChunks`).
- Duplicated date-math (`24*60*60*1000` ~10×) and per-provider pricing constants inline — drift-prone numerics.
- **authz/inline**: repeated reads of membership tables per request (could cache).

### Strengths
- Vite `manualChunks` code-splitting already in place; bundle reduced substantially.
- Health endpoint + service containers in CI; stray early N+1 caught; log query-string stripping keeps request bloat small.

---

## 7. Risks & Tech Debt

1. **Security**: unreachable Clerk webhook; cross-workspace LLM spend attribution; `userId`-only isolation; token-in-query param; env-name mismatch. (Highest priority.)
2. **API-first divergence**: server routes drifting from spec; `any`-typed bodies break the codegen contract and directive (REPO_DIRECTIVE E1 "never hand-edited").
3. **Legacy Clerk SDK** (`@clerk/clerk-sdk-node`, deprecated) pending migration.
4. **Supply-chain lockfile drift** (non-canonical stale `package-lock.json`) and Node-version drift (20/22/24).
5. **Broken deploy action** (`actions/action-setup@v4`) + `|| true` audit — CI gates can pass with real failures.
6. **Frontend/mobile not wired** to auth token getter; web UI disconnected from gated API; mobile has its own ad-hoc client + hard-coded prod base URL.
7. **Test/coverage debt**: no coverage measurement, no tests for 5 of 9 packages, no e2e.
8. **Dead/demo surface**: static-mock pages, `usage-engine` simulation, `verify_sync`, `debug2.test`, no-op `sentry.ts`, `.gitkeep` cruft.
9. **No RLS / workspace data isolation** at the DB layer.
10. **Encryption not KMS-backed**; keys may be undecryptable across restarts.

---

## 8. Concrete Strengths

1. **Genuine API-first codegen pipeline** (`openapi.yaml` → Orval → Zod + React Query) — strong contract foundation when followed.
2. **Adherence to governance** (REPO_RULES): branch-only workflow in use, audit naming, verification gate with seed scan + paginated doc-freshness, `docs/_baseline.json`, RAD Rule 2 respected (docs updated with code).
3. **Supply-chain discipline**: `minimumReleaseAge` guard, `onlyBuiltDependencies` allowlist, esbuild/tsx overrides — ahead of many repos.
4. **SQL injection-safe data layer** (Drizzle builder, parameterized `sql\`...\``), strict TS baseline, zero suppression comments.
5. **Webhook signature verification** (Stripe + SVIX, timingSafeEqual, drift window) done properly.
6. **Defense-in-depth middleware** (Helmet + rate limiters + CSRF + body caps + query-stripping audit logging + prod error obfuscation).
7. **Centralized env validation** via Zod, central error handler, structured pino.
8. **Multi-target dev** (web + mobile + sandbox) with shared typing; active bundle-splitting.
9. **Solid test foundation** (30-file vitest suites across server/db/web) and dockerized CI with real postgres/redis service containers.
10. **Clear mission constitution** (REPO_DIRECTIVE) with traceable tasks and a working `verify.sh` gate.

---

## NEXT 20 TASKS

Prioritization: default `high` for anything touching authz/security, contract drift, or broken CI. All marked `traces-to` for REPO_DIRECTIVE compliance.

### 🔐 Security

1. **Fix unreachable Clerk webhook + unify webhook env naming**
   - Priority: **high**
   - Rationale: `/api/webhooks/clerk` is signature-verified yet never served (auth bypass list misses `/webhooks/clerk`), and codes reads `CLERK_WEBHOOK_SIGNING_SECRET` while env schema validates `WEBHOOK_SECRET`. Either breaks real Clerk provisioning.
   - Acceptance: `/api/webhooks/clerk` reachable without bearer token AND SVIX HMAC verified; a single via-joint webhook env var name validated/enforced in `env.ts`; test covers both.
   - traces-to: P1/E2

2. **Enforce workspace membership in LLM telemetry/proxy attribution**
   - Priority: **high**
   - Rationale: `telemetry.ts` `workspaceId`/`projectId` come from client with no membership check → cross-tenant ledger pollution/cost attribution. Authorization gap.
   - Acceptance: LLM route bodies reject `workspaceId`/`projectId` the requester isn't a member of (401/403); revert scenario signed test.
   - traces-to: P1/E2

3. **Introduce per-user rate limiting (in addition to per-IP)**
   - Priority: **medium**
   - Rationale: Current limits are IP-only; a distributed brute force of a single account from many IPs is possible.
   - Acceptance: secondary limiter keyed on `req.userId` for sensitive routes; test verifies burst is capped per user across varying IPs.
   - traces-to: P1/E2

4. **Drop token-in-query-string auth**
   - Priority: **medium**
   - Rationale: `?token=` can leak via RepoReferer/history/logs.
   - Acceptance: require `Authorization: Bearer`; query-param fallback removed; related test updated; existing robustness for Clerk token remains.
   - traces-to: P1/E2

5. **Apply CSV formula-injection guard in `reports.ts`**
   - Priority: **medium**
   - Rationale: `analytics.ts` already guards; `reports.ts` CSV export does not → formula injection in spreadsheets.
   - Acceptance: reuse `sanitizeCsvField` on exported fields; add single-row regression test.
   - traces-to: P2/E3

### Backend / API-first

6. **Rebase drifted server routes onto OpenAPI (contract re-centering)**
   - Priority: **high**
   - Rationale: ~8 route groups are hand-authored outside `openapi.yaml`, breaking the API-first directive and producing `any`-typed I/O.
   - Acceptance: budgets, reports, exports, notifications, sync(-mobile), receipts-list, provisioning, results, currency are declared in the spec; Orval regenerates types; server bodies use generated schemas; client types for record generate.
   - traces-to: P1/E1

7. **Migrate Clerk `clerk-sdk-node` → `@clerk/express`**
   - Priority: **high**
   - Rationale: legacy SDK is deprecated/EOL (GROUND-TRUTH High). 
   - Acceptance: `middlewares/auth.ts` uses `@clerk/express`; auth tests pass; no `clerk-sdk-node` in lockfile.
   - traces-to: P1/E2

8. **Add pagination to all list endpoints & make limits request-driven**
   - Priority: **high**
   - Rationale: unbounded `GET` risks perf/DoS; hard-coded `.limit(10/50)` are magic.
   - Acceptance: consistent `limit`/`offset` (or cursor) params via codegen'd request schemas; every list route returns `items`+`hasMore`/count; tests cover paging behavior & empty result.
   - traces-to: P1/E1

9. **De-duplicate workspace-membership checking into one middleware/service**
   - Priority: **medium**
   - Rationale: 3 copies of the same (workspaceId,userId) membership query; drift-prone and a potential authz inconsistency vector.
   - Acceptance: single `requireWorkspaceMember` path consumed by routes + usage-engine/webhook-processor; remove `isWorkspaceMember` duplicate; tests.
   - traces-to: P1/E2

10. **Collapse the 9× provider sync blocks into a single table-driven module**
    - Priority: **medium**
    - Rationale: `sync-engine.ts` (754) duplicates near-identical fetch→sumTokens→insert logic 9 times with inline TODO "real API integration".
    - Acceptance: one provider-definition table (API/model/pricing) driving a single `syncProvider()`; behavior preserved across OpenAI/Anthropic/Cohere/etc.; unit test with a mock provider.
    - traces-to: P2/E3

11. **Standardize the API error envelope**
    - Priority: **medium**
    - Rationale: clients currently guess via `getStringField(title/detail/message/error)`.
    - Acceptance: single `{error:{code,message,details,status}}` from handlers + error middleware; update client deserialization; targeted tests.
   - traces-to: P1/E1

12. **Replace simulated `usage-engine` with sparse, real pipeline (or remove)**
    - Priority: **low**
    - Rationale: near-unreachable "simulation"; `webhook-processor.ts` is the real path.
    - Acceptance: either wire to `webhook-processor` or delete (with approval); no dead/simulated compute paths referenced.
   - traces-to: P2/E3

### Frontend (ai-tracker & mobile)

13. **Wire auth token into the ReactQuery client (reconnect web↔API)**
    - Priority: **high**
    - Rationale: web UI never calls `setAuthTokenGetter`/`setBaseUrl`; `custom-fetch.ts` token logic is dormant → API calls fail in practice.
    - Acceptance: token getter registered from a session/context; authenticated request succeeds against requireAuth routes; 401 handler added.
    - traces-to: P1/E2

14. **Make mobile consume the shared client & env-driven base URL**
    - Priority: **medium**
    - Rationale: `mobile-app/src/lib/api.ts` re-implements fetch, bypasses auth/CSRF/error-mapping, hard-codes the prod URL in source.
    - Acceptance: mobile uses `api-client-react` (setBaseUrl/getTokenGetter); remove ad-hoc `api.ts`; base URL from config/app.json; tests for a screen.
    - traces-to: P3/E1

15. **Evict or wire static mock pages (ai-tracker)**
    - Priority: **low**
    - Rationale: ~many pages (azure-ai, aws-bedrock, gpu-waste, sso, compliance, cost-centers, cicd-integration, ranking) are pure static UI, inflating surface & confusion.
    - Acceptance: each static page either consumes the real query/endpoint or is clearly catalogued as mock; dead pages removed only with Shayan approval (Rule 14).
   - traces-to: P1/E1

### Data / Performance

16. **Add `workspace_id` scoping + DB-level RLS invalidation plan**
    - Priority: **high**
    - Rationale: reads filter only on `userId`; multi-workspace collaboration is inconsistent. Data-layer isolation is a security-by-default requirement.
    - Acceptance: CRUD queries constrained with workspaceId from `requireWorkspaceMember`; risk doc/env RLS proposal; tests confirm a user in workspace B can't read workspace A records.
    - traces-to: P1/E2

17. **Paginate `reports`/`analytics` heavy reads & batch N+1 anomaly check**
    - Priority: **medium**
    - Rationale: `reports/generate` loads full history then slices; anomaly detection does N+1 per-flagged item.
    - Acceptance: `generate` streams/limits by bounds; `anomalyRun` use batched set IN + bulk insert; verify query counts constant vs data size.
    - traces-to: P2/E3

### Dependencies / Tooling

18. **Remove/stabilize stale `package-lock.json` and pin single Node engine**
    - Priority: **medium**
    - Rationale: dual-lockfile drift + Node 20/22/24 disagreement risk npm-based installs and divergent dependency resolutions.
    - Acceptance: delete stale `package-lock.json` (with approval) or regenerate; log `engines.node` once at `>=22`; gate.yml matches CI workflow engine; pnpm-frozen used everywhere.
    - traces-to: P1/S1

19. **Fix broken `deploy.yml` action and stop masking CI failures**
    - Priority: **medium**
    - Rationale: `actions/action-setup@v4` doesn't exist → deploy fails at runtime; `pnpm audit … || true` hides vulnerability signals.
    - Acceptance: correct to `pnpm/action-setup@v4` (or remove); remove `|| true` from audit/db-migrate' audit step; add a failing test to prove gate rejects real error.
   - traces-to: R30

### Docs / Governance

20. **Refresh architecture & README against actual contract surface (incl. Zod is v3, not v4)**
    - Priority: **low**
    - Rationale: README states "Zod v4" (actual v3.25) and "OpenAPI-first" while ~8 route groups drift; GROUND-TRUTH stale.
    - Acceptance: README table reflects real versions (Zod v3), documents route coverage gaps, Node requirement; GROUND-TRUTH updated; CHANGELOG noted (Rule 39).
    - traces-to: R1/R31

---

## Caveats

- This audit is based on static inspection; no runtime behavior was exercised. Some escalations (e.g., Clerk webhook reachability, deploy action failure) are inferred from code structure and CI config, and should be confirmed with a deliberate runtime test.
- Verification status: typecheck/build/test were **not** re-run in this pass (read-only audit). The prior GovernanceBootstrap audit + WORKFLOW state is the living baseline.
- Pre-existing uncommitted `verify.sh`/`verify.ps1`/`gate.yml` edits predate this report and are untouched.