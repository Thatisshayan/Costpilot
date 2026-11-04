# Launch readiness audit

Date: 2026-11-04. Agent: Codex. Baseline: e276a7a, PR #7.

## Decision and evidence limits

**Not ready for public launch.** This is a broad source/configuration audit, not a production certification. Inspected middleware, expense and related financial routes, workspace invitations, dashboard, remediation, health, startup, monitoring, encryption setup, database tooling, Docker, deployment and verification workflows. Compared the August audit and today's repository-state audit. The graph service returned `Transport closed`; source inspection was used instead. No production credentials, paid calls, live deployment, payment transactions, database restore, device sessions or accessibility/browser sessions were exercised. Those are open evidence gates, not presumed defects or passes.

Previous fixes for expense scope and query-token authentication remain present. Their focused tests do not prove the full middleware/client journey: this audit found CSRF blocking bearer writes and dashboard SSE still using a simulated identity.

## Findings and closure criteria

| ID | Priority | Finding and evidence | Required closure |
|---|---|---|---|
| L01 | P0 | `middlewares/csrf.ts` requires cookies for bearer writes; native/cross-origin clients cannot supply the double-submit pair. | Exempt explicit bearer transport while preserving downstream token verification; test cookie and bearer paths, then prove authenticated create/update/delete in staging. Code fix started in this pass. |
| L02 | P0 | Prior PR security job reported 153 dependency advisories (14 critical); Orval 8.9.1 is in the checked-in lock. Current advisory counts were not refreshed here. | Capture a fresh machine-readable audit, upgrade direct dependencies and compatible transitive packages, regenerate contracts, rerun builds/tests and Snyk. No unreviewed blanket overrides or audit suppression. |
| L03 | P0 | `deploy.yml` supplies neither Clerk publishable key nor API origin to the Pages build. | Supply repository variables and fail on missing configuration; verify deployed sign-in, CORS and protected writes. Workflow fix started here; remote variables unverified. |
| L04 | P0 | `dashboard.tsx` uses EventSource with `simulatedUserId=user_1`; EventSource does not attach the configured bearer helper. | Replace with authenticated fetch streaming or authenticated polling; test expiry, reconnect and cancellation. Never restore query tokens. |
| L05 | P0 | `credits.ts` and `subscriptions.ts` accept project/platform IDs without same-scope validation and return names from unscoped joins. Expense policy is not yet applied across the whole financial surface. | Enumerate every route; centralize resource scopes and validate references; test user A/B plus owner/admin/viewer/nonmember, including exports/aggregates and revoked memberships. |
| L06 | P0 | `remediation.ts` delays then records provider success without a provider call; cron also marks actions completed. | Disable execution until a real adapter verifies outcomes, or implement adapters with explicit consent, retries, idempotency and provider evidence. No simulated success in launch mode. |
| L07 | P0 | `dashboard.tsx` falls back to mock spending, savings, sources and renewals; cost-centers/status/LLM-router contain random metrics. | Define the launch feature inventory; remove production mock fallback, show truthful empty/error/unavailable states, and hide unfinished features. Validate totals against a seeded ledger. |
| L08 | P0 | `ci.yml` invokes a nonexistent DB `migrate` script and masks its failure; DB package exposes generate/push only. | Add a versioned migration runner and CI PostgreSQL integration job; compare schema/migration state, rehearse empty DB + upgrade + rollback/restore. Never migrate a real database merely to audit it. |
| L09 | P1 | Root had no test script; verifier uses `--if-present` and package-manager fallbacks. PowerShell RunTimed does not enforce its timeout. | Root suite wired in this pass; next make both verifier implementations fail on missing/failing required stages, use only the selected manager and enforce timeouts. Verify failure injection. |
| L10 | P1 | `lib/sentry.ts` logs rather than sending telemetry; cron is initialized in every API process. | Implement/test telemetry and alert delivery, graceful shutdown, singleton/distributed job execution, deduplication and retry handling. Prove no duplicate spend during retries/scaling. |
| L11 | P1 | Docker installs unpinned pnpm; workflows mostly use mutable installs. `deploy-dry` only prints a manual Railway instruction. | Docker manager pinned in this pass; use frozen installs everywhere and add Docker build/smoke and staging readiness probes. Build alone is not a deploy rehearsal. |
| L12 | P1 | Invitation acceptance falls back to invite email and uses separate DB updates; membership lookup does not filter membership status. | Define invite bearer-secret/verified-email policy; enforce it, consume invitations transactionally and uniquely, require active membership, and test expired/reused/concurrent invitations. |
| L13 | P1 | Encryption is local envelope encryption, not managed cloud KMS; keys are checked at import time while env schema makes both optional. | Validate startup key requirements, document actual key custody, rotate/recover keys in staging, confirm log redaction, define retention/export/account deletion. Review existing privacy/terms against actual behavior with the product owner. |
| L14 | P1 | No release evidence gathered for browser/device UX, keyboard/screen-reader use, load, actual billing, backups or incident response. | Execute the acceptance matrix in the launch plan and attach evidence. Unmeasured areas stay open. |

P0 blocks launch. P1 must be completed or explicitly removed from the launch surface with a documented owner decision. This audit does not claim exhaustive line-by-line review of every route.

## Execution record

Started L01 (bearer CSRF compatibility + five regression cases), L03 (Pages variables and validation), L09 (root recursive test script), L11 (Docker pnpm 9.15.9 pin). See the launch plan for dependent work and release evidence. npm lockfile deletion still needs Shayan's direct approval under Rule 14; no deletion performed.

Verification: `pnpm --filter @workspace/api-server exec vitest run src/middlewares/__tests__/csrf.test.ts src/middlewares/__tests__/auth.test.ts --pool=threads --maxWorkers=1` passed (21 tests). The Git Bash `scripts/verify.sh` run completed a 104-commit gitleaks scan with no leaks, then stopped progressing at doc-freshness and was interrupted. A recursive workspace suite stopped progressing during DB suite startup and was interrupted; no full-suite pass is claimed. The root test entry now runs the same explicit API/web suites as existing CI; database integration coverage remains L08/L09 work. Docker build, Pages deployment and live auth were not run. Full governance verification remains open.
