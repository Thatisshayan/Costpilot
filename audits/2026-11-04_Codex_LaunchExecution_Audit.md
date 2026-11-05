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

Contract-generation follow-up: Node 22 CI ran Orval 8.46 successfully, then found missing DOM.Iterable declarations for generated Headers.entries. The shared TypeScript libs were corrected and React Query generation explicitly pinned to v5. Local gitleaks scanned 107 commits with no findings; the older CI scanner reported two findings, so the verifier now prints only redacted rule/file/line metadata for diagnosis. Container fixture credentials were shortened to unambiguous test values.

Node 22 CI at 18e9371 passed the API/web test job and library typecheck. The disposable PostgreSQL workflow passed fresh/repeated migration, route isolation/concurrency/load checks and backup/restore, then failed production-container readiness. Container diagnostics were added; the Sentry SDK is externalized so instrumentation resolves its own runtime dependencies. No container readiness pass is claimed yet.

Runtime milestone: PostgreSQL/restore and production-container smoke workflow passed at cb38ff8 (Actions run 41943128054). It exercised signed RSA tokens through the actual Clerk verifier, bearer create/update/delete, CSV/PDF and disabled preview execution. User-provided test publishable key configured in ignored local web/mobile env files and the GitHub web variable; its value was not printed or committed. Supported Clerk SDK and compatible patch migration is in progress and will rerun all checks.

Maintained SDK/compatible patch audit reduced remaining findings to 0 critical, 4 high, 4 moderate and 2 low. Remaining parent chains are under review. The maintained-SDK PostgreSQL/container rehearsal also passed (run 41944217422). Full build identified two remaining Zod 3 `.errors` references in preview budget handlers; these were migrated to `.issues`. The older CI secret scanner flagged pre-existing literal JWT_SECRET/WEBHOOK_SECRET values under API test-step environment configuration; these are replaced with generated, masked per-run CI values, with no ignore rule or skipped scan.

Further closure: native compilation now passes with the maintained SDK/MFA flow. Web compilation exposed a nullable-reference contract mismatch and an existing two-argument error-capture consumer; the contract/helper were corrected. Optional Replit-only Vite plugins were removed from package manifests/configuration to eliminate their unused vulnerable development chain; the standard Vite overlay remains. Native module ranges are aligned to Expo 56.0.24 bundledNativeModules.json, and Android bundle validation is added to CI.

### Native SDK compatibility checkpoint

Expo 58 / React Native 0.88 passed PostgreSQL migrations, isolation/invitation concurrency, backup/restore, and the production-container smoke on [run 41945919464](https://github.com/Thatisshayan/Costpilot/actions/runs/41945919464). Mobile typechecking exposed removed StatusBar props, nullable color schemes, and an obsolete custom tab ref type; corrected those and removed the preview subscription link from mobile web navigation. Updated DB-package auth assertions for exact webhook routing and redacted verifier errors. Generated contracts now include nullable expense references and invitation capabilities.

The Expo 58 advisory report was 0 critical, 0 high, 2 moderate, 1 low. A targeted glob 13→14 and minimatch 10→11 override now addresses the remaining moderate cancellation/amplification defects; Babel receives its same-major patch. Upstream diffs preserve the matching entry points but change internals, so this override remains subject to full native export/tooling verification (no audit suppression). See [glob change history](https://github.com/isaacs/node-glob/compare/v13.0.6...v14.0.2) and [minimatch change history](https://github.com/isaacs/minimatch/compare/v10.2.5...v11.0.1).

### Core write follow-through

Added native personal expense editing/deletion, refresh-on-focus, explicit currency and correct local calendar defaults/rendering. Mobile bearer requests reject foreign origins. Corrected the remaining historical screen StatusBar prop variants. Invitation creation now locks the workspace and writes both records in one transaction, with a second duplicate check under the lock. Project/platform deletes use returning rows and report 404 on denied/missing targets. Export bodies are strict and reject unsupported dateRange instead of generating misleading report labels. Extended the PostgreSQL rehearsal with concurrent invitation creation, viewer/missing deletion and unsupported export filter assertions. These changes require fresh CI; actual device checks remain open.

### Identity boundary completion

The patched lockfile audit now reports **zero advisories at every severity** (`pnpm audit --json`, 2026-11-04). Added foreign-origin token-leak regression coverage for mobile. Clerk default-workspace provisioning now tolerates duplicate/concurrent signed deliveries using conflict-safe inserts, checks existing workspace ownership before membership creation, and preserves the transaction. The production smoke now checks actual RSA token expiry/authorized-party rejection, query-token rejection and concurrent signed webhook delivery. Fresh exact-SHA verification is required for these additions.

The 8cbdd43 disposable PostgreSQL/restore/container rehearsal passed, including new invitation-creation concurrency and denied-delete checks. Full build/typecheck passed, but API unit verification exposed an outdated platform delete test double lacking Drizzle returning(); corrected the double and added failure-response coverage. Both web and mobile request helpers now reject foreign API origins before obtaining/attaching session tokens, with regression coverage. Full fresh verification remains required.

### Verified core checkpoint — ab017b0

- [Governance 41947753763](https://github.com/Thatisshayan/Costpilot/actions/runs/41947753763): `bash scripts/verify.sh` passed, including secret scan, doc freshness, frozen install, full build/typecheck, 138 API tests and 43 web/client tests.
- [Launch verification 41947747115](https://github.com/Thatisshayan/Costpilot/actions/runs/41947747115): code generation/diff, build/tests, native lint tooling and Android export passed.
- [Launch rehearsal 41947753723](https://github.com/Thatisshayan/Costpilot/actions/runs/41947753723): repeated migrations, PostgreSQL concurrency/isolation, restore and expanded production RSA/webhook replay smoke passed.
- [API CI 41947753729](https://github.com/Thatisshayan/Costpilot/actions/runs/41947753729): passed.

The following setup-doc/mobile-default revision (9594a50) triggered the older CI secret scanner on the literal example encryption placeholder in both templates; that string is not a key. The template now leaves the value empty and documents private local generation. No scanner rule was disabled or allowlisted. New exact-revision checks remain required.

### Final review follow-through

Validated PR review findings against source: nonempty workspace deletion previously SET NULL on shared foreign keys. The API now locks the workspace, refuses deletion while core records exist (409), and never changes their classification; added a PostgreSQL regression. CSV exports preserve numeric negative amounts while neutralizing risky strings. Missing Clerk key now dismisses the native splash so configuration errors are visible. Directive reference validation reads actual headings and checks every phase/sprint/epic reference. The documented secret-scan spec now matches the implemented fail-closed gitleaks requirement; no weak fallback or scan suppression was added. Shayan approved the privacy/support contact Obsidianmedia.yt@gmail.com; the draft notice includes it. Operator identity and remaining policy/configuration approvals remain open. Fresh exact-SHA checks are required.

### Approved hosting direction

Shayan selected the existing GitHub Pages web URL and confirmed the API host does not exist yet. Updated handoff/configuration guidance accordingly; no infrastructure was provisioned or billed. Web builds now emit an identical 404.html SPA entry for direct-link/refresh handling, and launch verification checks that artifact. Corrected the web environment example's nonexistent local-proxy assumption: configure localhost:8080 explicitly, with Vite's default localhost:3000 allowed. Local server origins now also include the approved Pages origin; hosted server/Clerk configuration remains pending. Exact-SHA checks and deployed routing acceptance remain required.

### API hosting preparation

Inspection of the existing staging config exposed pre-existing unsupported multi-service keys, rejected NODE_ENV=staging, and an incorrect health path. Replaced both Railway service definitions with the official per-service build/deploy structure, correct `/api/healthz`, bounded failure restarts and graceful-draining time. Python jsonschema validated both files against the downloaded official Railway schema. No database, service, secret, migration or deployment was created; provisioning/region/spend approval and real environment acceptance remain open.
