# Deferred Work Register

Rule 12 / Rule 11. This register survives the session. Future agents resume from here.

## Format
- `[DATE] <scope>: <what> — <why deferred> — <resume hint> — <status>`

## Items

- [2026-08-02] security: Clerk `/api/webhooks/clerk` reachability and secret configuration — **CLOSED 2026-11-04**. `requireAuth` bypasses the Clerk webhook path; the handler verifies Clerk signatures with `CLERK_WEBHOOK_SIGNING_SECRET`, which is included in env validation. `WEBHOOK_SECRET` is a separate secret for incoming provider webhooks, not a conflicting name. Evidence: `artifacts/api-server/src/middlewares/auth.ts`, `artifacts/api-server/src/routes/webhooks.ts`, `artifacts/api-server/src/lib/env.ts`.
- [2026-08-02] authz: cross-workspace spend attribution in `routes/telemetry.ts` — **CLOSED 2026-11-04**. `/llm-route` and `/chat/completions` validate workspace membership through `assertWorkspaceContext` before budget checks and spend writes. Evidence: `artifacts/api-server/src/routes/telemetry.ts`.
- [2026-08-02] authz: expense CRUD was scoped by `userId`, so shared-workspace data access was inconsistent — **CLOSED 2026-11-04**. Personal expenses are owner-only. Shared expenses are readable by workspace members and writable by owners/admins; workspace assignment cannot be changed through updates. Platform/project references must match the expense scope. Authz tests cover member reads and viewer write denial. Evidence: `artifacts/api-server/src/routes/expenses.ts`, `artifacts/api-server/src/routes/__tests__/expenses.test.ts`, `lib/api-spec/openapi.yaml`.
- [2026-08-02] security: `?token=` query-param auth in `middlewares/auth.ts` — **CLOSED 2026-11-04**. Production authentication now accepts only `Authorization: Bearer`; a regression test confirms query tokens are rejected without calling Clerk token verification. Evidence: `artifacts/api-server/src/middlewares/auth.ts`, `artifacts/api-server/src/middlewares/__tests__/auth.test.ts`.
- [2026-08-02] repo: stale `package-lock.json` alongside canonical `pnpm-lock.yaml`; Node version mismatch — Node standardization **COMPLETED 2026-11-04** (root requires Node 22+, the governance gate uses Node 22 and the pnpm lock cache). The npm lockfile decision remains **OPEN**: recommend removing it because pnpm is the declared canonical package manager, but do not delete it until Shayan approves; regeneration is the alternative if npm installs must remain supported. Evidence: `package.json`, `.github/workflows/gate.yml`, `pnpm-lock.yaml`.
- [2026-08-02] CI: deployment action and masked audit failure — **CLOSED 2026-11-04**. `deploy.yml` uses `actions/setup-node@v4` and `pnpm/action-setup@v4`; `pnpm audit --audit-level=moderate` now fails the job on audit errors. Evidence: `.github/workflows/deploy.yml`.
- [2026-08-02] integration: web/mobile API authentication and client configuration — **IMPLEMENTED 2026-11-04**. Both clients use Clerk session token getters, configurable API origins, and bearer-authenticated API helpers; fake mobile sign-in/guest access and simulated-user headers were removed. Client helper tests verify origin and bearer headers. Live sign-in still requires the Clerk publishable keys and Native API setting described by the app environment templates. Evidence: `artifacts/ai-tracker/src/main.tsx`, `artifacts/mobile-app/src/app/_layout.tsx`, `artifacts/mobile-app/src/lib/api.ts`, `artifacts/ai-tracker/src/lib/api-auth.test.ts`.

## Proposed plan for remaining work

1. **Complete and verify client authentication.** Clerk token wiring, configurable API origins, query-token removal, and client bearer-header tests are implemented. Configure the app publishable keys and enable Clerk Native API before a live mobile sign-in check.
2. **Complete expense workspace authorization.** Personal/shared behavior, membership checks, same-scope project/platform validation, and focused authorization tests are implemented.
3. **Close the lockfile policy decision.** Node 22 and the root engine requirement are implemented. Shayan should approve either removing the stale npm `package-lock.json` (recommended because pnpm is canonical) or regenerating it if npm installs remain supported. Do not delete it without approval.

The closed auth and expense items have targeted tests: 30 API auth/expense tests and 2 web/mobile client-helper tests passed on 2026-11-04. Live Clerk sign-in was not exercised because publishable keys and the Clerk dashboard Native API setting are environment configuration. Runtime webhook delivery remains outside this change.
