# Launch execution audit — 2026-11-04

Agent: Codex. Branch: docs/fix-doc-drift. Launch remains blocked pending verification and external configuration.

## Implemented in this checkpoint

- Replaced the dashboard's mock totals, fake audits and unauthenticated EventSource with authenticated expense polling and separate currency totals.
- Restricted launch navigation and API routes to the reviewed core surface. Preview/provider execution remains unavailable; the API no longer starts background provider jobs. Removed simulated provider success from remediation logic.
- Extended active-membership scopes to projects/platforms and final expense mutations. Invitation acceptance locks/consumes the token transactionally; workspace creation is transactional. Invitation links now contain actual tokens, respect the Pages base path, and use the actual signed-in user's role in the collaboration UI. Member-list responses omit invite capabilities.
- Generated migration 0001 adds missing invitation/budget tables and membership columns, a membership unique index and expense indexes.
- Added actual monitoring SDKs, error capture and bounded graceful shutdown; runtime delivery is unverified. Server startup validates configuration before loading the app.
- Added strict portable verification, frozen CI installs, Node 22 contract/build/test workflow, PostgreSQL isolation/concurrency/load/backup-restore rehearsal and production-container smoke checks. These new checks must still run.
- Shayan explicitly approved removing package-lock.json; it was removed. No other tracked file was deleted.

## Verification evidence and limits

- Generated migration with `node node_modules/drizzle-kit/bin.cjs generate --config drizzle.config.ts` from lib/db: succeeded; no database was migrated by that command.
- Pinned-pnpm advisory query after same-major patches: 0 critical, 66 high, 48 moderate, 11 low. Raw reports are private under audits/private/. Remaining advisories still block the security-audit job; no policy bypass was added.
- Focused API snapshot: 42/43 tests passed. The failure expected a verifier error detail intentionally removed from public 401 responses; that test was corrected and needs rerunning. No current full-suite pass claimed.
- A local Node 22 container attempt exposed missing .npmrc in Docker COPY; both Dockerfiles were corrected. Subsequent Docker engine calls returned API errors. No container pass claimed.
- Local disposable-DB preparation returned ECONNREFUSED. No application database changes were made; migration/restore evidence remains pending.
- Isolated frozen dependency install was interrupted after slow network/download progress. Existing development modules were preserved. Remote CI is being used for independent Node 22 evidence.
- GitHub variable/secret name inventory returned no configured names. Local configuration inventory found missing/template client keys, API origins, encryption keys and Clerk webhook secret. Values were not printed. Live Clerk/device/provider checks were not performed.
- Draft privacy/terms pages now flag required operator review instead of claiming unverified retention, compliance, address or recovery guarantees.

## Remaining gates

See docs/governance/LAUNCH_PLAN.md and RELEASE_RUNBOOK.md. Resolve remaining dependency advisories, run/fix the new exact-SHA CI checks, commit regenerated contracts, configure approved staging origins/keys/secrets, verify real sign-in and device journeys, approve legal/support/retention details, and obtain Shayan's release approval. No billable deploy, production migration or provider execution occurred.
CI follow-up: first checkpoint jobs failed during pnpm/action-setup because the major-only `9` did not exactly match packageManager `pnpm@9.15.9`. Workflow versions were aligned to 9.15.9 before rerunning. No application test pass is inferred from setup-only failures.
