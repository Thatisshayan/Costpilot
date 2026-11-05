# Launch closure plan

Owner: Codex for implementation and evidence collection; Shayan for product scope, environment access, paid operations and release approval. Status: **launch blocked**, 2026-11-04.

Evidence: [launch audit](../../audits/2026-11-04_Codex_LaunchReadiness_Audit.md). Durable backlog: [deferred work](DEFERRED_WORK.md).

## Execution order

1. **Make the core journey usable (L01, L03, L04).** Finish bearer writes, deployment config and authenticated dashboard updates. Exit: a real Clerk user can sign in on web/mobile, create/edit/delete an expense and sign out; expired/invalid tokens fail. Test deployed web origin and physical-device API origin. Publishable keys/Native API/CORS configuration must be supplied in staging.
2. **Close security and data integrity (L02, L05, L12, L13).** Triage dependency advisories, update packages in coherent batches, regenerate contracts, enforce the same scope model across related resources, and harden invitations. Exit: no known critical vulnerabilities; remaining advisories assessed and resolved to the release policy; multi-user negative-access tests pass; secrets and key recovery are verified. Shayan approved npm lockfile removal; it is complete, with pnpm canonical.
3. **Make every launch feature truthful (L06, L07).** Inventory routes/screens and choose ship/disable for each. Minimal launch proposal: Clerk login, personal/workspace expenses, scoped projects/platforms, accurate dashboard and exports. Disable simulated remediation and demo analytics until real integrations are verified. Exit: no invented spending/savings/uptime or provider-success claims on enabled screens; totals reconcile to fixtures and actual import records.
4. **Make releases recoverable (L08–L11).** Version migrations, test against PostgreSQL, tighten verifier failures and frozen installs, build/smoke Docker, implement telemetry and safe jobs. Exit: fresh/upgrade migration tests, idempotent import/webhook tests, backup restore and rollback rehearsal pass; deployment probes and alert delivery have evidence. No production migrations or billable deployment without authorization.
5. **Rehearse release (L14).** Execute the matrix below, fix failures, and update the register with evidence links. Exit: every enabled feature has acceptance evidence, required and security checks pass on the exact release SHA, and Shayan approves merge/release. No automatic production launch is authorized by this plan.

## Acceptance matrix

| Area | Required evidence |
|---|---|
| Identity and permissions | Real web + device sign-in/sign-out; expiry; two users; owner/admin/viewer/nonmember; revoked membership; cross-scope guessed IDs rejected. |
| Financial accuracy | Known seeded expenses/currencies/timezones; import replay; reports/export totals; empty and error states; no duplicate spend from webhook retries. |
| Payments/integrations | If enabled: Stripe test-mode signatures/replay/ordering, provider sandbox sync and real error recovery. Otherwise disable and remove launch claims. |
| UX and accessibility | Primary journeys at mobile/desktop widths; keyboard, focus, labels, errors, contrast and screen-reader spot checks; loading/offline states. |
| Reliability and scale | Representative data volume and concurrent-user measurements; DB indexes/pagination; timeouts; restart during jobs; graceful shutdown; health probes. Set numeric latency/error/restore objectives before measuring. |
| Operations and privacy | Staging secrets inventory without values, log redaction, monitoring alert, backup restore, rollback, retention/deletion/export and support/incident owner. |
| Delivery | Frozen install, full typecheck/test/build, secret scan, dependency audit, contract regeneration diff, Docker smoke, migration CI, deployed staging smoke; exact commit recorded. |

## Current execution status — 2026-11-04

The core release scope is implemented and documented in [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md). Authentication, personal/shared expense CRUD, scoped projects/platforms, invitations, truthful dashboard and exports are enabled. Native expense management is personal; shared-workspace management uses the web app. Preview provider/AI/payments/telemetry functions remain disabled. Nonempty workspaces cannot be deleted or have their records silently reassigned to personal scope.

The patched lockfile audit reports **0 critical / 0 high / 0 moderate / 0 low**. Maintained Clerk SDKs, Expo 58 / React Native 0.88 and Node 22.13+ replace deprecated tooling. Targeted glob/minimatch security overrides passed native lint and Android export at the verified checkpoint. Generated clients include invitation capabilities and nullable expense references.

At ab017b0, the full governance verification, build/typecheck, 138 API tests, 43 web/client tests, deterministic contract generation/diff, native lint and Android export passed. Disposable PostgreSQL 16 rehearsals passed fresh/repeated migrations, access isolation, invitation concurrency, backup/restore and actual production-container RSA/expiry/authorized-party/query-token checks, signed webhook replay, CRUD and CSV/PDF. See [execution audit](../../audits/2026-11-04_Codex_LaunchExecution_Audit.md) for links. Final review/setup changes must pass on their exact commit before merge; inspect [PR #7](https://github.com/Thatisshayan/Costpilot/pull/7).

The supplied Clerk **test** publishable key is configured in ignored web/mobile files and GitHub's public build variable. Shayan approved **Obsidianmedia.yt@gmail.com** as privacy/support contact, now included in the draft notice. The mobile helper requires an explicit API origin and never silently uses a hardcoded production service.

## Remaining sequence

1. The existing Pages web URL is approved. Select/provision an approved API host and confirm its URL and public operator identity. Configure matching server Clerk/webhook secrets, authorized domains/Native API, and persistent encryption-key custody privately. Run the status-only environment preflight; the missing contact input is resolved.
2. Complete real two-account web and physical-device journeys, Pages base-path/CORS checks, actual webhook delivery and approved monitoring delivery. CI's synthetic identity/database tests do not replace these checks.
3. Approve terms/privacy/data practices, retention/deletion/backup and on-call/hosting decisions. Verify a real environment backup/restore and record the release commit, URL, time and evidence. The draft legal pages remain an explicit public-release blocker.
4. Require all final exact-SHA CI checks and Shayan approval before merge, migration, release or paid deployment. No production migration/deployment has occurred.

[LAUNCH_HANDOFF.md](LAUNCH_HANDOFF.md) lists every configuration value, where it belongs, verification evidence, local limitations and next-agent instructions. Local Docker API errors and refused PostgreSQL connections prevented local runtime rehearsal; the successful database/container evidence comes from isolated Node 22 CI.
