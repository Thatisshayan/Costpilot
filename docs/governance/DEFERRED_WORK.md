# Deferred Work Register

Rule 12 / Rule 11. This register survives the session. Future agents resume from here.

## Format
- `[DATE] <scope>: <what> — <why deferred> — <resume hint> — <status>`

## Items

- [2026-08-02] security: Clerk `/api/webhooks/clerk` unreachable (auth bypass list omits `/webhooks/clerk`); env `WEBHOOK_SECRET` vs code `CLERK_WEBHOOK_SIGNING_SECRET` mismatch — deferred (audit-only) — resume: fix `middlewares/auth.ts:30` bypass + align `webhooks.ts:167`/`lib/env.ts` — OPEN (see docs/AUDIT_REPORT_2026-08-02.md)
- [2026-08-02] authz: cross-workspace spend attribution in `routes/telemetry.ts` (workspaceId from body/headers w/o membership check) — deferred (audit-only) — add membership guard in /llm-route & /chat/completions — OPEN
- [2026-08-02] authz: readonly isolation is by `userId` only; multi-workspace collaboration inconsistent — deferred — scope CRUD by `workspaceId` from `requireWorkspaceMember` — OPEN
- [2026-08-02] security: `?token=` query-param auth in `middlewares/auth.ts` — deferred (mitigated by query-stripping logger) — drop in favor of Bearer header — OPEN
- [2026-08-02] repo: stale `package-lock.json` non-canonical (pnpm-lock canonical); Node engine 20/22/24 drift — deferred — approve removal or regenerate + add `engines.node` — OPEN
- [2026-08-02] CI: `deploy.yml` uses nonexistent `actions/action-setup@v4`; `pnpm audit … || true` masks failures — deferred (audit) — fix action name; un-silence audit — OPEN
- [2026-08-02] integration: `ai-tracker` doesn't call `setAuthTokenGetter` (web↔API disconnected); mobile has its own ad-hoc client + hard-coded base URL — deferred — wire shared client + env base URL — OPEN
