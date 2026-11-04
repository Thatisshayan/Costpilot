# Deferred Work Register

Rule 12 / Rule 11. This register survives the session. Future agents resume from here.

## Format
- `[DATE] <scope>: <what> — <why deferred> — <resume hint> — <status>`

## Items

- [2026-08-02] security: Clerk `/api/webhooks/clerk` reachability and secret configuration — **CLOSED 2026-11-04**. `requireAuth` bypasses the Clerk webhook path; the handler verifies Clerk signatures with `CLERK_WEBHOOK_SIGNING_SECRET`, which is included in env validation. `WEBHOOK_SECRET` is a separate secret for incoming provider webhooks, not a conflicting name. Evidence: `artifacts/api-server/src/middlewares/auth.ts`, `artifacts/api-server/src/routes/webhooks.ts`, `artifacts/api-server/src/lib/env.ts`.
- [2026-08-02] authz: cross-workspace spend attribution in `routes/telemetry.ts` — **CLOSED 2026-11-04**. `/llm-route` and `/chat/completions` validate workspace membership through `assertWorkspaceContext` before budget checks and spend writes. Evidence: `artifacts/api-server/src/routes/telemetry.ts`.
- [2026-08-02] authz: expense CRUD is scoped by `userId`, so shared-workspace data access is inconsistent — deferred — plan: decide workspace versus personal-record semantics, then authorize each workspace operation with `requireWorkspaceMember` and constrain reads/writes to the authorized workspace; preserve explicit handling for records without a workspace — OPEN
- [2026-08-02] security: `?token=` query-param auth in `middlewares/auth.ts` — deferred (query strings are stripped from request logs, but query tokens remain exposed to browser/history/referrer surfaces) — plan: remove the query-token fallback, require `Authorization: Bearer`, and update auth tests and any documented callers — OPEN
- [2026-08-02] repo: stale `package-lock.json` alongside canonical `pnpm-lock.yaml`; Node version mismatch — deferred — plan: standardize on Node 22 (matching README and application workflows), add root `engines.node`, align `gate.yml`, and decide with Shayan whether to regenerate or remove the npm lockfile; do not delete it without approval — OPEN
- [2026-08-02] CI: deployment action and masked audit failure — **CLOSED 2026-11-04**. `deploy.yml` uses `actions/setup-node@v4` and `pnpm/action-setup@v4`; `pnpm audit --audit-level=moderate` now fails the job on audit errors. Evidence: `.github/workflows/deploy.yml`.
- [2026-08-02] integration: web/mobile API authentication and client configuration — deferred — plan: register the Clerk session token getter and API base URL in `ai-tracker`; configure the mobile API endpoint through app environment/config and attach the authenticated token; then verify authenticated requests against protected API routes — OPEN

## Proposed plan for remaining work

1. **Complete client authentication and remove query-token auth.** Wire Clerk tokens and configurable API origins into web and mobile clients, remove the query-string fallback, and verify protected requests from both clients. This closes the current client/API disconnect while retiring the weaker token transport.
2. **Make workspace authorization consistent.** Define how personal records and shared workspace records behave, then enforce membership and workspace scoping across expense CRUD and related reads/writes. Add tests for a member accessing shared data and a non-member being denied.
3. **Set one supported Node/package-manager policy.** Standardize CI and local tooling on Node 22, add the root engine declaration, then ask Shayan whether the stale npm lockfile should be regenerated or removed. Keep pnpm as the canonical lockfile and use frozen installs in CI where supported.

The closed statuses above are based on static inspection of the current source/configuration. Runtime webhook delivery, auth flows, and authorization behavior still need their targeted tests when those changes are next exercised.
