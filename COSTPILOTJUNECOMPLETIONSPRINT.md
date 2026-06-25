# CostPilot — June Completion Sprint

**Target:** Elevate project from 6.1/10 → 8.0/10  
**Scope:** All directions — Security, Quality, Testing, Performance, Observability, DevOps, Product, Architecture, Mobile, Documentation  
**Last Audit Score:** 6.1/10 (June 25, 2026)

---

## BUILDER AGENT DIRECTIVE

Take ownership of this project end-to-end. Create subagents as needed, coordinate them, give each one a clear job, keep them focused, compare their answers, audit their answers, give them specialized skills as needed. Resolve disagreements and apply improvements and execute tasks as plans define directly. Verify the result and only stop for destructive, secret-related, paid, external-network, production, or irreversible actions. Keep going until the project is done or you hit a real blocker. Do not stop for small questions.

**Token-saving mode ON.**

After each phase:
1. Assign a subagent to update all documentation to match completed work
2. After documents are updated — commit all changes and push to main
3. No exceptions

Subagents must work in parallel wherever possible. If parallel work cannot be performed, the orchestrator executes directly. Spawn subagents only when they can genuinely work simultaneously to increase speed. Make no mistakes — there is no more time for rework.

---

## PHASE 1 — Security Hardening (Complete the remaining gaps)

- [ ] **S-01** Migrate `@clerk/clerk-sdk-node` → `@clerk/express` in `artifacts/api-server/package.json` and update the import in `artifacts/api-server/src/middlewares/auth.ts`. Run `pnpm install`. Verify typecheck and auth tests still pass.
- [ ] **S-02** Make `ENCRYPTION_KEY` required (not optional) in `artifacts/api-server/src/lib/env.ts`. Add 64-char hex stub to CI workflow env block.
- [ ] **S-03** Remove `token` query-param auth path in `artifacts/api-server/src/middlewares/auth.ts` (lines 36–38). Tokens in URLs appear in server logs. All callers must use Authorization header.
- [ ] **S-04** Add an allowlist for the `:provider` path param in `artifacts/api-server/src/routes/webhooks.ts` incoming handler. Only accept known provider names (e.g. `openai`, `anthropic`, `aws`). Return 400 for anything else.
- [ ] **S-05** Add `guard workspaceId` NaN check in `artifacts/api-server/src/routes/webhooks.ts` GET handler — after `parseInt`, return 400 if result is NaN or ≤ 0.
- [ ] **S-06** Audit all route files in `artifacts/api-server/src/routes/` for missing try/catch on async handlers. Every async route handler must have error handling. Wrap bare `async (req, res) =>` handlers with a `try/catch` that calls `next(err)`.
- [ ] **S-07** Replace `member.role as any` cast in `artifacts/api-server/src/middlewares/auth.ts` with a typed role enum from the DB schema.
- [ ] **S-08** Replace `req.auth?: any` type in the Express Request extension with the actual Clerk session claims type from `@clerk/express`.
- [ ] **S-09** Add `STRIPE_WEBHOOK_SECRET` to the required fields in `env.ts` — it is currently optional but required for signature verification. Add CI stub `whsec_testsecretstub00000000000000000000000`.
- [ ] **S-10** Audit `artifacts/api-server/src/routes/` for any endpoint that returns DB row objects directly without field filtering. Ensure no internal fields (e.g. encrypted API keys, internal IDs) are leaked in responses.
- [ ] **S-11** Add request ID propagation — generate a UUID per request in a middleware and attach it to `req.id`, include it in all log entries and error responses.
- [ ] **S-12** Add `X-Content-Type-Options`, `X-Frame-Options` validation — confirm Helmet sets these; add explicit config if not.
- [ ] **S-13** Add CORS preflight caching header (`Access-Control-Max-Age`) to reduce preflight round trips while maintaining security.
- [ ] **S-14** Verify `artifacts/api-server/src/lib/kms-vault.ts` — ensure KMS master key path is hardened and the fallback behavior is documented. If fallback to local key occurs in production, log a FATAL-level warning.
- [ ] **S-15** Add `helmet.contentSecurityPolicy()` with an explicit policy to `artifacts/api-server/src/app.ts`. Do not use the default wildcard.

---

## PHASE 2 — Code Quality & Architecture

- [ ] **Q-01** Refactor `artifacts/api-server/src/lib/sync-engine.ts` into a platform adapter pattern. Create `artifacts/api-server/src/lib/adapters/` directory. Each cloud provider (AWS, Azure, GCP, OpenAI) gets its own file implementing a `PlatformAdapter` interface with a `sync(platformId, userId, apiKey): Promise<SyncResult>` method. `syncPlatform()` becomes a dispatcher.
- [ ] **Q-02** Convert all `for` loop `db.insert()` calls in sync adapters to batch inserts using Drizzle's `.values([...])` array form. Eliminates N DB round trips per sync.
- [ ] **Q-03** Create a service layer directory `artifacts/api-server/src/services/` (already partially exists). Move business logic out of route handlers into service functions. Routes should only parse input, call service, return response.
- [ ] **Q-04** Remove `artifacts/api-server/src/routes/debug2.test.ts` if it is a throwaway debug file. If it contains real tests, rename it descriptively.
- [ ] **Q-05** Remove `if (true)` pattern scan — grep the entire codebase for `if (true)` and `if (false)` — delete all dead branches found.
- [ ] **Q-06** Replace all `(err as Error).message` casts with proper type guards: `err instanceof Error ? err.message : String(err)`.
- [ ] **Q-07** Audit all `TODO` comments in `artifacts/api-server/src/lib/sync-engine.ts` — either implement the feature or convert to a GitHub Issue reference and remove the comment from code.
- [ ] **Q-08** Add Zod validation for all route path params (`:workspaceId`, `:platformId`, etc.) using a shared `numericId` schema. Apply before DB calls in every route.
- [ ] **Q-09** Remove `artifacts/mockup-sandbox/` from the monorepo or move it to a `design/` directory clearly marked as non-production. It should not be part of `pnpm -r build`.
- [ ] **Q-10** Extract CORS configuration from `artifacts/api-server/src/app.ts` into `artifacts/api-server/src/lib/cors.ts` for testability.
- [ ] **Q-11** Extract rate limiter definitions from `app.ts` into `artifacts/api-server/src/lib/rate-limiters.ts`.
- [ ] **Q-12** Add ESLint to `artifacts/api-server/` with rules: `no-console`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-floating-promises`. Fix all violations.
- [ ] **Q-13** Enable `strict: true` in `artifacts/api-server/tsconfig.json` if not already set. Fix any new type errors that surface.
- [ ] **Q-14** Resolve all `@ts-ignore` and `@ts-expect-error` comments in the codebase — fix the underlying type issues instead.
- [ ] **Q-15** Add a `pnpm lint` script to root `package.json` and include it in the CI pipeline before typecheck.
- [ ] **Q-16** Standardize error response shape across all routes: `{ error: string, message: string, code?: string }`. No endpoint should return a plain string error body.
- [ ] **Q-17** Audit `lib/db/src/schema/` — verify every table has `createdAt` and `updatedAt` columns with `defaultNow()` and `$onUpdate(() => new Date())`.
- [ ] **Q-18** Add database migration for any schema changes surfaced in Q-17. Run `drizzle-kit generate` and commit the migration file.
- [ ] **Q-19** Remove `artifacts/api-server/src/lib/.gitkeep` and `artifacts/api-server/src/middlewares/.gitkeep` — directories are no longer empty.
- [ ] **Q-20** Audit `lib/api-spec/openapi.yaml` — every route implemented in `artifacts/api-server/src/routes/` must have a corresponding OpenAPI operation. Add any missing ones.
- [ ] **Q-21** Run `pnpm --filter @workspace/api-spec run generate` (orval) after Q-20 to regenerate `lib/api-zod/src/generated/` and `lib/api-client-react/src/generated/`. Commit the regenerated files.
- [ ] **Q-22** Add `artifacts/api-server/.gitignore` with `dist/` and `*.log` entries. Remove `dist/` from git tracking with `git rm -r --cached`.
- [ ] **Q-23** Standardize all date fields in DB schema to use `timestamp with time zone` not plain `timestamp`. Update Drizzle schema and generate migration.
- [ ] **Q-24** Add `workspaceId` missing-insert guard — in `expenses.ts` route, verify that `workspaceId` from the token matches the `workspaceId` in the request body before inserting.
- [ ] **Q-25** Audit `artifacts/api-server/src/routes/index.ts` — verify every route file is registered and that route prefixes are consistent with the OpenAPI spec.

---

## PHASE 3 — Testing

- [ ] **T-01** Add unit tests for `parseCSV()` in `sync-engine.ts` — cover: empty input, single row, quoted commas, CRLF line endings, missing columns.
- [ ] **T-02** Add unit tests for each platform adapter (after Q-01 refactor) — mock `db` and `fetch`, verify correct expense shape is returned.
- [ ] **T-03** Add integration test for the CSRF middleware — verify POST without token returns 403, POST with matching token returns 200, webhook routes are exempt.
- [ ] **T-04** Add test for `workspaceId` NaN guard in webhook GET — send `?workspaceId=abc` and verify 400 response.
- [ ] **T-05** Add test for the `:provider` allowlist (after S-04) — send unknown provider and verify 400.
- [ ] **T-06** Add test for `requireAuth` token-in-query rejection (after S-03) — verify 401 when token is in query param.
- [ ] **T-07** Add test for `ENCRYPTION_KEY` not set scenario — verify server startup throws and does not silently use random key.
- [ ] **T-08** Add test for `encrypt()` / `decrypt()` round-trip with a known key — verify output is deterministic for same IV (test with fixed IV mock).
- [ ] **T-09** Add test for `isWorkspaceMember()` — cover: member exists with correct role, member exists with wrong role, member does not exist, DB throws.
- [ ] **T-10** Add test for Stripe webhook — valid signature succeeds, invalid signature returns 400, missing `STRIPE_WEBHOOK_SECRET` returns 401.
- [ ] **T-11** Add test for Clerk webhook — valid SVIX signature succeeds, replayed timestamp (>300s old) returns 400, `user.created` event provisions workspace correctly.
- [ ] **T-12** Add test for the incoming provider webhook — correct secret passes, wrong secret returns 401, unknown provider (after S-04) returns 400.
- [ ] **T-13** Add test for the error handler middleware — verify 500 response shape, verify no stack trace leaks in production mode.
- [ ] **T-14** Add test for rate limiter configuration — verify `aiScannerLimiter` applies to `/api/audits/scan` and not to `/api/expenses`.
- [ ] **T-15** Add test for `validateEnv()` — mock `process.env`, verify it throws on missing required fields with a descriptive message listing all missing vars.
- [ ] **T-16** Add `vitest` coverage reporting — add `--coverage` flag to test script, set minimum thresholds: statements 70%, branches 65%, functions 70%.
- [ ] **T-17** Add test for `syncPlatform()` dispatcher — verify unrecognized platform returns `success: false` with "No sync adapter found" message (no DB insert).
- [ ] **T-18** Add tests for `artifacts/ai-tracker/` frontend — target the Reports, AutoPilot, and Settings pages. Minimum 10 new tests.
- [ ] **T-19** Add snapshot tests for critical API response shapes — dashboard summary, expense list, platform list.
- [ ] **T-20** Add test timeout configuration to `vitest.config.ts` — set `testTimeout: 10000` and `hookTimeout: 10000` to prevent flaky CI.
- [ ] **T-21** Add test for `requireWorkspaceMember` middleware — verify owner can access, viewer blocked from admin-only routes, non-member gets 403.
- [ ] **T-22** Set up test database seeding — create a `beforeAll` fixture that seeds a workspace, user, and platform for integration tests. Remove per-test setup duplication.
- [ ] **T-23** Add load test script using `autocannon` or `k6` for `/api/expenses` and `/api/dashboard/summary` — document baseline RPS in `GROUND-TRUTH.md`.
- [ ] **T-24** Add test for PDF export route in `artifacts/api-server/src/routes/exports.ts` — verify response is `application/pdf` with non-zero content length.
- [ ] **T-25** Add test for concurrent sync requests — verify two simultaneous `syncPlatform()` calls for the same platform do not double-insert expenses (idempotency).
- [ ] **T-26** Add `pnpm --filter @workspace/ai-tracker run test` to the CI workflow in `.github/workflows/ci-api-server.yml`.
- [ ] **T-27** Add `pnpm --filter @workspace/db run test` coverage reporting to CI.
- [ ] **T-28** Create `artifacts/api-server/src/routes/__tests__/sync.test.ts` — test the sync route endpoint (not just the engine directly).
- [ ] **T-29** Add negative tests for Zod validation on all POST body routes — send malformed body and verify 400 with descriptive error.
- [ ] **T-30** After all new tests are written, run the full suite and verify ≥ 200 tests passing with zero skipped.

---

## PHASE 4 — Performance

- [ ] **P-01** Configure DB connection pool in `lib/db/src/index.ts` — add `{ max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 }` to `pg.Pool`.
- [ ] **P-02** Implement Redis caching for `GET /api/dashboard/summary` — cache per `(workspaceId, month)` key with 5-minute TTL. Use `ioredis`. Fall back to DB if Redis unavailable.
- [ ] **P-03** Implement Redis caching for `GET /api/platforms` — cache per `workspaceId` with 2-minute TTL. Invalidate on platform create/update/delete.
- [ ] **P-04** Add DB indexes to `lib/db/src/schema/expenses.ts` for `(workspaceId, date)` and `(platformId)` — most dashboard queries filter on these. Generate and commit the migration.
- [ ] **P-05** Add DB index to `lib/db/src/schema/workspace_members.ts` for `(workspaceId, userId)` — used on every auth check. Generate migration.
- [ ] **P-06** Add pagination to all list endpoints that can return unbounded results: expenses, platforms, subscriptions, webhooks, projects. Use `limit` + `offset` query params with a max `limit` of 100.
- [ ] **P-07** Add `select()` field projection to all Drizzle queries that currently use `.select()` with no arguments — avoid fetching encrypted API keys in list queries.
- [ ] **P-08** Implement batch insert in sync adapters (after Q-02) — verify with a benchmark that a 100-row sync takes <200ms.
- [ ] **P-09** Add `compression` middleware to `artifacts/api-server/src/app.ts` for gzip response compression on JSON endpoints.
- [ ] **P-10** Add `ETag` support to the dashboard summary endpoint — clients can use `If-None-Match` to skip re-fetching unchanged data.
- [ ] **P-11** Add frontend bundle analysis — run `vite-bundle-visualizer` on `artifacts/ai-tracker/` and document the top 5 largest chunks. Split any chunk still > 500KB.
- [ ] **P-12** Lazy-load all page-level components in `artifacts/ai-tracker/src/` using `React.lazy()` and `Suspense`.
- [ ] **P-13** Audit and remove unused npm dependencies in all packages — run `npx depcheck` on each workspace package. Remove anything not imported.
- [ ] **P-14** Add query result limits to all analytics/aggregation queries — ensure no single DB query scans more than 1 year of data without a date range filter.
- [ ] **P-15** Profile the `/api/sync` endpoint — measure time from request to response for a 10-item sync. If >1s, identify the bottleneck and fix it.

---

## PHASE 5 — Observability

- [ ] **O-01** Verify `artifacts/api-server/src/lib/sentry.ts` is imported and initialized in `artifacts/api-server/src/index.ts` before any other imports. Sentry must be initialized first.
- [ ] **O-02** Add Sentry error capturing to the global error handler in `artifacts/api-server/src/middlewares/errors.ts` — call `Sentry.captureException(err)` before sending the response.
- [ ] **O-03** Implement OpenTelemetry tracing — add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`. Initialize in `index.ts`. Export traces to stdout in dev, OTLP in production.
- [ ] **O-04** Add request ID middleware — generate `crypto.randomUUID()` per request, set as `req.id`, add `X-Request-ID` response header, include in all pino log entries.
- [ ] **O-05** Add structured audit logging for all state-changing operations (create/update/delete expense, platform, workspace member changes). Log: `{ action, userId, workspaceId, resourceType, resourceId, timestamp }`.
- [ ] **O-06** Wire `artifacts/api-server/src/lib/audit-emitter.ts` to a real consumer — write audit events to a `audit_logs` DB table. Create the schema and migration.
- [ ] **O-07** Add a `/metrics` endpoint (behind auth) exposing: request count, error rate, DB pool size, sync success/failure counts. Use plain JSON, not Prometheus format, unless `prom-client` is already a dependency.
- [ ] **O-08** Add log level configuration to CI test runs — set `LOG_LEVEL=warn` in CI env to suppress noise during tests.
- [ ] **O-09** Add health check depth to `/api/health` — current check is likely a 200 stub. Add DB connectivity check and Redis connectivity check. Return `{ status: "ok" | "degraded", db: "ok" | "error", redis: "ok" | "error" }`.
- [ ] **O-10** Add structured error logging in sync-engine catch block — log `{ platformId, userId, provider, error: err.message, stack: err.stack }` at ERROR level.
- [ ] **O-11** Add pino log rotation configuration for production — use `pino/file` transport with daily rotation. Document in deployment guide.
- [ ] **O-12** Add a sync history table — record every sync attempt: `{ platformId, userId, status, expensesImported, durationMs, errorMessage, createdAt }`. Create schema and migration.
- [ ] **O-13** Expose sync history via `GET /api/platforms/:id/sync-history` endpoint with pagination.
- [ ] **O-14** Add alert thresholds — document in `GROUND-TRUTH.md`: what metric values should trigger investigation (e.g. error rate > 1%, sync failure rate > 10%, DB pool exhausted).
- [ ] **O-15** Add `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers in `artifacts/api-server/src/index.ts` that log at FATAL level before exiting.

---

## PHASE 6 — DevOps & CI/CD

- [ ] **D-01** Add pnpm dependency caching to all GitHub Actions workflows — use `actions/cache` with key based on `pnpm-lock.yaml` hash. This will significantly reduce CI run time.
- [ ] **D-02** Add automated deployment step to `.github/workflows/deploy.yml` — trigger on push to `main`, deploy to Railway staging automatically. Stop before production deploy (require manual approval).
- [ ] **D-03** Add branch protection configuration documentation in `GROUND-TRUTH.md` — list required status checks: typecheck, lint, test, build.
- [ ] **D-04** Add `npm audit --audit-level=high` step to CI — fail the build if any high or critical vulnerabilities are found.
- [ ] **D-05** Add a `secrets-scan` CI step using `trufflehog` or `gitleaks` action — scan all commits for accidentally committed secrets.
- [ ] **D-06** Split the CI workflow into parallel jobs: `typecheck`, `lint`, `test-api`, `test-frontend`, `build`. They should run concurrently, not sequentially.
- [ ] **D-07** Add a `docker build` validation step to CI — build the `artifacts/api-server/Dockerfile` and verify it succeeds with no warnings.
- [ ] **D-08** Add `docker-compose.test.yml` that spins up the full stack (api-server + postgres + redis) for integration testing. Document how to run locally.
- [ ] **D-09** Add `.env.test` template with all required env vars pre-filled with safe test stubs. Document in README.
- [ ] **D-10** Add a `pre-commit` hook using `husky` + `lint-staged` — run ESLint and typecheck on staged files before every commit.
- [ ] **D-11** Add `dependabot.yml` configuration to auto-raise PRs for outdated npm dependencies on a weekly schedule.
- [ ] **D-12** Add a `release` workflow — on manual trigger, bump the version in `package.json`, create a git tag, and generate a changelog from commit messages.
- [ ] **D-13** Verify `railway.staging.json` and `railway.json` are up to date with current env var requirements. Add any new required vars documented in env.ts.
- [ ] **D-14** Add `HEALTHCHECK` instruction to `artifacts/api-server/Dockerfile` pointing to `/api/health`.
- [ ] **D-15** Add multi-stage Docker build to `artifacts/api-server/Dockerfile` — builder stage (installs devDeps, builds) and runtime stage (only production deps + dist). Minimize image size.

---

## PHASE 7 — Product Features & API Completeness

- [ ] **F-01** Implement real Anthropic usage sync in `sync-engine.ts` (or new adapter) — use `GET https://api.anthropic.com/v1/usage` with `x-api-key` header. Parse response and insert real expense rows.
- [ ] **F-02** Implement real Cohere sync — research Cohere billing API. If no public API exists, document this explicitly and surface it to the user via the sync result message instead of silently failing.
- [ ] **F-03** Implement real DeepSeek sync — use `GET https://api.deepseek.com/user/balance` to get credit usage. Map to expense row.
- [ ] **F-04** Implement real Mistral sync — use `GET https://api.mistral.ai/v1/usage` with Bearer token. Parse token usage and calculate cost at current pricing.
- [ ] **F-05** Implement real Groq sync — research Groq usage endpoint. If unavailable, implement webhook ingestion path instead and document setup steps.
- [ ] **F-06** Implement real Replicate sync — use `GET https://api.replicate.com/v1/predictions` paginated. Calculate cost from prediction metadata.
- [ ] **F-07** Add OpenAI sync to use the correct endpoint — current code uses `/v1/usage` which is deprecated. Update to the current billing API or usage dashboard API.
- [ ] **F-08** Add a `lastSyncedAt` column to the platforms table. Update it on every successful sync. Expose in `GET /api/platforms` response.
- [ ] **F-09** Add a manual sync trigger — `POST /api/platforms/:id/sync` — that runs `syncPlatform()` for the given platform and returns the `SyncResult`.
- [ ] **F-10** Add a cron job in `artifacts/api-server/src/lib/cron-service.ts` that auto-syncs all active platforms every 24 hours. Log results to the sync history table (after O-12).
- [ ] **F-11** Add budget alerts — when an expense sync causes total monthly spend to exceed a configured budget threshold, emit an audit event and (if configured) trigger a webhook notification.
- [ ] **F-12** Implement the notifications service `artifacts/api-server/src/services/notifications.ts` — add `sendEmail(to, subject, body)` using a transactional email provider (Resend or SendGrid). Gate behind env var `EMAIL_PROVIDER_KEY`.
- [ ] **F-13** Connect budget alerts (F-11) to the notifications service (F-12) — send email when budget threshold exceeded.
- [ ] **F-14** Add `GET /api/analytics/forecast` endpoint — return projected spend for the next 30 days based on trailing 90-day average. Return `{ projected: number, currency: string, confidence: "low"|"medium"|"high" }`.
- [ ] **F-15** Implement `GET /api/reports/monthly` — return per-platform monthly spend summary grouped by category. Used by the Reports page.
- [ ] **F-16** Implement PDF export — `GET /api/exports/pdf?workspaceId=&month=` — generate a real PDF using `pdfkit` with workspace name, month, expense table, and total. Return as `application/pdf`.
- [ ] **F-17** Implement CSV export — `GET /api/exports/csv?workspaceId=&month=` — return RFC 4180 compliant CSV of expense rows.
- [ ] **F-18** Add `GET /api/workspaces/:id/members` endpoint that returns all members with their roles. Used by the Collaboration screen.
- [ ] **F-19** Add `DELETE /api/workspaces/:id/members/:userId` endpoint for removing workspace members. Owner only.
- [ ] **F-20** Add `PATCH /api/workspaces/:id/members/:userId` endpoint for changing a member's role. Owner and admin only.
- [ ] **F-21** Implement the `GET /api/intelligence/activity` endpoint — return a time-ordered list of notable events (large expense spikes, new platforms, budget threshold crossings) for the workspace.
- [ ] **F-22** Add `GET /api/subscriptions/expiring` endpoint — return subscriptions whose trial or renewal date is within the next 14 days. Used for the "expiring trials" alert.
- [ ] **F-23** Add `POST /api/credits/purchase` endpoint connected to Stripe — create a Stripe payment intent, return `clientSecret` to the frontend. Do not process payment server-side.
- [ ] **F-24** Add `GET /api/cicd/runs` endpoint — return recent CI/CD runs from the `cicd` table with status, duration, and cost attribution.
- [ ] **F-25** Implement remediation execution in `artifacts/api-server/src/routes/remediation.ts` — when `POST /api/remediation/execute` is called with a `remediationId`, mark it as executed and record the outcome. No external API calls without explicit user confirmation.
- [ ] **F-26** Add `GET /api/platforms/:id/expenses` endpoint — return all expenses for a single platform with optional date range filter.
- [ ] **F-27** Add `GET /api/dashboard/calendar` — return expense data grouped by day for the current month. Used by the calendar view.
- [ ] **F-28** Implement GPU telemetry ingestion — `POST /api/telemetry/gpu` accepts GPU usage data and stores it in the `gpuTelemetry` schema. Return stored record.
- [ ] **F-29** Add workspace slug uniqueness enforcement — on `POST /api/workspaces`, verify the slug is not already taken before insert. Return 409 if duplicate.
- [ ] **F-30** Add `GET /api/workspaces/mine` endpoint — return all workspaces where the authenticated user is a member (any role). Used at login to redirect to the correct workspace.

---

## PHASE 8 — Mobile App

- [ ] **M-01** Implement the login screen `artifacts/mobile-app/src/app/login.tsx` — integrate Clerk Expo SDK for sign-in with email/password and social providers.
- [ ] **M-02** Implement the expenses list screen `artifacts/mobile-app/src/app/expenses.tsx` — fetch from `GET /api/expenses` via `lib/api-client-react`, display in a FlatList with pull-to-refresh.
- [ ] **M-03** Implement add-expense screen `artifacts/mobile-app/src/app/add-expense.tsx` — form with amount, currency, category, platform selector, date picker. Submit to `POST /api/expenses`.
- [ ] **M-04** Implement subscriptions screen `artifacts/mobile-app/src/app/subscriptions.tsx` — list active subscriptions with renewal date and amount. Highlight expiring within 14 days.
- [ ] **M-05** Implement notifications screen `artifacts/mobile-app/src/app/notifications.tsx` — list recent alerts (budget exceeded, large expense, expiring subscription).
- [ ] **M-06** Implement dashboard home screen `artifacts/mobile-app/src/app/index.tsx` — show current month spend, top platform by cost, and a simple spark line chart. Use `react-native-svg` or `victory-native`.
- [ ] **M-07** Configure Clerk Expo token storage — use `expo-secure-store` for token persistence. Ensure tokens survive app restart.
- [ ] **M-08** Add the API base URL to `artifacts/mobile-app/src/lib/api.ts` — configure for dev (localhost) and production (Railway URL) using Expo's `APP_VARIANT` or `.env`.
- [ ] **M-09** Add push notification support — integrate `expo-notifications`. Request permission on first launch. Store push token on backend via `POST /api/notifications/register-device`.
- [ ] **M-10** Add receipt camera capture — on the add-expense screen, add a camera button that opens `expo-camera`, captures a photo, and uploads to `POST /api/receipts/upload`. Display parsed result.
- [ ] **M-11** Add biometric authentication gate — after login, require Face ID / Touch ID on app resume using `expo-local-authentication`.
- [ ] **M-12** Add offline support — cache the last expense list and dashboard summary in `AsyncStorage`. Show cached data when network is unavailable, display a banner indicating offline mode.
- [ ] **M-13** Add EAS build configuration to `artifacts/mobile-app/eas.json` — configure `development`, `preview`, and `production` profiles. Document how to trigger a build.
- [ ] **M-14** Add Expo Router navigation structure — ensure tab navigation shows: Dashboard, Expenses, Subscriptions, Notifications, Settings. Each tab must have a working screen.
- [ ] **M-15** Add dark mode support in `artifacts/mobile-app/src/constants/theme.ts` — ensure all screens use the `useColorScheme` hook and switch correctly between light and dark.
- [ ] **M-16** Write mobile component tests using `@testing-library/react-native` — cover ExpenseCard, SubscriptionCard, NotificationsScreen. Minimum 15 tests.
- [ ] **M-17** Add error boundary to `artifacts/mobile-app/src/app/_layout.tsx` — catch render errors and show a user-friendly fallback screen instead of a white crash screen.
- [ ] **M-18** Add app version display in a Settings screen — show current `app.json` version and environment (dev/prod).
- [ ] **M-19** Configure deep linking — add URL scheme `costpilot://` in `app.json`. Handle `costpilot://expenses/:id` to deep link to a specific expense.
- [ ] **M-20** Add haptic feedback to key interactions (add expense confirm, pull-to-refresh) using `expo-haptics`.

---

## PHASE 9 — Frontend (ai-tracker) UI Completeness

- [ ] **UI-01** Audit every page in `artifacts/ai-tracker/src/` — identify any page that renders a placeholder, "coming soon", or empty state where real data should appear. List each one.
- [ ] **UI-02** Connect the Reports page to real API data — replace any mock/hardcoded data with `useGetReports()` hook from `lib/api-client-react`.
- [ ] **UI-03** Connect the AutoPilot page to real platform sync status — show last sync time, sync result, and a manual sync button per platform.
- [ ] **UI-04** Add loading skeletons to all data-fetching components — replace spinners with skeleton loaders that match the shape of the loaded content.
- [ ] **UI-05** Add empty states to all list views — expenses list, platforms list, subscriptions list. Each empty state must have an illustration and a clear CTA.
- [ ] **UI-06** Add error states to all data-fetching components — show a retry button when an API call fails. Log the error to the console.
- [ ] **UI-07** Add the Collaboration page — display workspace members list, role badges, invite form, and remove button (owner only).
- [ ] **UI-08** Implement the Settings page — allow updating workspace name, currency preference, and notification preferences. Submit via `PATCH /api/workspaces/:id`.
- [ ] **UI-09** Add a dark mode toggle — connect to the existing `useTheme` hook. Persist preference in localStorage.
- [ ] **UI-10** Add keyboard navigation support to all modal dialogs and dropdown menus — `Escape` closes, `Tab` cycles focus, `Enter` confirms.
- [ ] **UI-11** Add toast notifications for all mutation outcomes — success and error toasts for create/update/delete operations.
- [ ] **UI-12** Add a global loading indicator in the nav bar for pending API requests — use `react-query`'s `useIsFetching()` if available.
- [ ] **UI-13** Add the Budget management page — CRUD interface for budgets. Show current spend vs budget as a progress bar per category.
- [ ] **UI-14** Add the CSV/PDF export UI — button on the Reports page that calls the export endpoints and triggers a file download.
- [ ] **UI-15** Audit and fix all `console.error` and `console.warn` output visible in the browser dev tools during normal app usage.

---

## PHASE 10 — Documentation

- [ ] **DOC-01** Update `GROUND-TRUTH.md` to reflect all changes made during this sprint — completed tasks, new env vars, new endpoints, updated test counts.
- [ ] **DOC-02** Update `README.md` with: project overview, local dev setup (step by step), environment variable reference, how to run tests, how to deploy.
- [ ] **DOC-03** Create `ARCHITECTURE.md` — describe the monorepo structure, package dependency graph, data flow from mobile → api-server → DB, sync engine design.
- [ ] **DOC-04** Create `API.md` — list all endpoints with method, path, auth requirements, request/response shape, and example curl commands.
- [ ] **DOC-05** Create `CONTRIBUTING.md` — define commit message format, branch naming, PR checklist, code review expectations.
- [ ] **DOC-06** Create `SECURITY.md` — document the security model: auth flow, CSRF protection, webhook signature verification, encryption at rest, what data is encrypted.
- [ ] **DOC-07** Add JSDoc to all exported functions in `lib/db/src/`, `lib/api-client-react/src/`, and `lib/api-zod/src/` — parameter types and return types only, no narrative.
- [ ] **DOC-08** Document all required and optional environment variables in `.env.template` — add description and example value for every variable in `env.ts`.
- [ ] **DOC-09** Create `DEPLOYMENT.md` — Railway deployment steps, how to set env vars, how to run migrations in production, rollback procedure.
- [ ] **DOC-10** Update `artifacts/mobile-app/CLAUDE.md` and `artifacts/mobile-app/AGENTS.md` to reflect actual implemented screens and current architecture after Phase 8 work.

---

## Completion Criteria

The sprint is complete when:

- [ ] All P0 and P1 security issues are resolved
- [ ] Test count ≥ 200 passing, coverage ≥ 70%
- [ ] All list endpoints are paginated
- [ ] Redis is actively used for at least 2 cache layers
- [ ] All platform sync adapters are either real or explicitly documented as stub with a clear error message
- [ ] Mobile app has ≥ 5 functional screens
- [ ] Sentry is initialized and capturing errors
- [ ] All docs are up to date
- [ ] CI pipeline runs in parallel jobs and passes cleanly
- [ ] `git status` is clean after every phase commit

**Expected score after completion: 8.0–8.5 / 10**

---

*Generated by Principal Engineer Loop Controller — June 25, 2026*
