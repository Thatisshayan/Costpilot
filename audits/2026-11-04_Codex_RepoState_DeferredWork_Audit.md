# Repository State and Deferred Work Audit — 2026-11-04

- **Agent:** Codex
- **Scope:** Local Git state, remote synchronization, pull requests, worktrees, and `docs/governance/DEFERRED_WORK.md`
- **Method:** Read-only source/config inspection; fetched `origin`; queried open pull requests. No tests or builds were run.
- **Prior audit consulted:** `docs/AUDIT_REPORT_2026-08-02.md` and `audits/2026-07-23_Hermes_GovernanceBootstrap_Audit.md`.

## Git and GitHub state

- Current branch: `docs/fix-doc-drift`, tracking `origin/docs/fix-doc-drift`; local and upstream are even at `1b6a893`.
- `git fetch origin` completed. All seven local branches with upstreams report no ahead/behind commits. `main` is even with `origin/main` at `cf34541`.
- No stash entries were present.
- Before this report was added, the only untracked path was `.claude/`; no tracked modifications were present. The audit report itself is a new untracked file until staged/committed.
- One worktree exists: the repo root, checked out on `docs/fix-doc-drift`. It is not merged into `origin/main` and has open PR [#7](https://github.com/Thatisshayan/Costpilot/pull/7), titled “docs: fix doc drift — update GROUND-TRUTH, README, mark sprint doc historical.” GitHub reports it open and mergeable. It is the only open PR returned for this repo.
- Local branches not merged into `origin/main`: `agent/hermes-governance-bootstrap`, `docs/fix-doc-drift`, and `sentinel/work-1785668421918`. Only `docs/fix-doc-drift` has a worktree; the other two are branch refs without a worktree. `docs/fix-doc-drift` is the only attached worktree and is unmerged.
- Local branches without a separate worktree: `agent/claude/001-branch-onboarding`, `agent/claude/019-costpilot-audit-batch`, `agent/hermes-governance-bootstrap`, `agent/opencode/audit-2026-08-02`, `main`, `sentinel/fix-1-1785700899195`, and `sentinel/work-1785668421918`.

## Deferred work review

The register lists seven findings as `OPEN`. Static inspection found three closed/corrected findings and four that remain open:

| Register item | Current assessment | Evidence |
|---|---|---|
| Clerk webhook unreachable; webhook secret-name mismatch | **Closed / original wording inaccurate.** `requireAuth` bypasses `/webhooks/clerk`; the Clerk route verifies signatures using `CLERK_WEBHOOK_SIGNING_SECRET`; `validateEnv` includes that variable, and `.env.example` distinguishes it from the general `WEBHOOK_SECRET` used by provider webhooks. | `artifacts/api-server/src/middlewares/auth.ts:27-77`; `artifacts/api-server/src/routes/webhooks.ts`; `artifacts/api-server/src/lib/env.ts:27-59`; `.env.example` |
| Cross-workspace spend attribution through telemetry | **Closed.** `assertWorkspaceContext` resolves project-to-workspace context and checks membership; both LLM telemetry/proxy handlers call it before budget or spend attribution. | `artifacts/api-server/src/routes/telemetry.ts:18-59`, and handlers around lines 340 and 449 |
| Read-only/multi-workspace isolation uses `userId` only | **Open.** Expense list and item reads, updates, and deletes still scope by `userId`; workspace-level collaboration is not consistently the access boundary. | `artifacts/api-server/src/routes/expenses.ts:18-149` |
| Query-parameter token authentication | **Open.** `requireAuth` still falls back to `req.query.token`. | `artifacts/api-server/src/middlewares/auth.ts:27-77` |
| Stale npm lockfile and Node engine/version drift | **Open, partly outdated.** Both `package-lock.json` and `pnpm-lock.yaml` are tracked, and root `package.json` has no `engines.node`. Current workflows show Node 20 in `gate.yml` and Node 22 in the other inspected workflows; the README was corrected to Node 22, so the old “20/22/24” wording should be narrowed to 20/22. | `package.json`; `.github/workflows/gate.yml`; `.github/workflows/ci.yml`; `.github/workflows/deploy.yml`; `git ls-files` |
| `deploy.yml` action typo and masked audit failure | **Closed.** The deployment workflow uses `actions/setup-node@v4` and `pnpm/action-setup@v4`; `pnpm audit --audit-level=moderate` is no longer followed by `\|\| true`. | `.github/workflows/deploy.yml` |
| Web/mobile API authentication and client wiring | **Open.** `setAuthTokenGetter` is defined but has no callers; the web app does not register it. The mobile API client uses a hard-coded Railway URL and the mobile home screen also constructs a local `:3000` URL. | `lib/api-client-react/src/custom-fetch.ts:43-45`; `artifacts/ai-tracker/src/App.tsx:144-162`; `artifacts/mobile-app/src/lib/api.ts:1-26`; `artifacts/mobile-app/src/app/index.tsx:41-46` |

## Verification limits

This was a static code/config audit plus GitHub metadata inspection. No runtime webhook, auth, or workspace-isolation tests were run, and no tests/builds were executed. The source evidence supports the closed classifications for the two telemetry/auth-routing findings and the deploy workflow finding, but runtime behavior was not exercised.
