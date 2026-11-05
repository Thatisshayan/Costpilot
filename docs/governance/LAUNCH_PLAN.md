# Launch closure plan

Owner: Codex for implementation and evidence collection; Shayan for product scope, environment access, paid operations and release approval. Status: **launch blocked**, 2026-11-04.

Evidence: [launch audit](../../audits/2026-11-04_Codex_LaunchReadiness_Audit.md). Durable backlog: [deferred work](DEFERRED_WORK.md).

## Execution order

1. **Make the core journey usable (L01, L03, L04).** Finish bearer writes, deployment config and authenticated dashboard updates. Exit: a real Clerk user can sign in on web/mobile, create/edit/delete an expense and sign out; expired/invalid tokens fail. Test deployed web origin and physical-device API origin. Publishable keys/Native API/CORS configuration must be supplied in staging.
2. **Close security and data integrity (L02, L05, L12, L13).** Triage dependency advisories, update packages in coherent batches, regenerate contracts, enforce the same scope model across related resources, and harden invitations. Exit: no known critical vulnerabilities; remaining advisories assessed and resolved to the release policy; multi-user negative-access tests pass; secrets and key recovery are verified. Remove or regenerate npm lock only after Shayan's decision.
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

## First implementation batch

- Implemented: L01 bearer CSRF path (21 auth/CSRF tests passed), L03 Pages config guard, L09 explicit API/web root test entry, L11 Docker manager pin. Full governance verification, Docker and deployment verification remain open; see audit execution record.
- Next batch: authenticated dashboard updates, production mock-data removal and explicit remediation disablement.
- Then dependency remediation and full scope/migration hardening. Do not call these complete based only on source changes.


## Execution checkpoint — 2026-11-04

Core release scope is recorded in [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md). The web dashboard now uses recorded expense data; preview routes/provider execution are disabled. Active membership scoping extends to projects/platforms and expense writes. Invitation acceptance is transactional. A generated migration adds missing invitation/budget tables, membership columns, uniqueness and expense indexes. Verification scripts now fail on required stage errors and enforce timeouts; CI has frozen installs, generated-contract verification and a disposable PostgreSQL/restore rehearsal.

Patched-lockfile audit: zero critical advisories, 66 high, 48 moderate, 11 low at this checkpoint. Remaining dependency advisories and full verification are OPEN; this is not release approval. Monitoring SDKs and graceful shutdown are implemented but not yet runtime verified. Docker engine is returning API errors and local PostgreSQL refused connection; neither restore nor migration success is claimed. An isolated dependency install and remote CI verification are in progress.

Shayan approved removal of package-lock.json; it has been removed. The remaining external gates are actual staging origins/client keys, server encryption/webhook configuration, approved privacy/support details, live sign-in/device checks and release approval. No production migration or deployment has been performed.

Authentication SDK migration in progress: maintained @clerk/backend, @clerk/react and @clerk/expo replace deprecated package names. Native custom sign-in uses the vendor-supported legacy hook compatibility entry point and now includes email codes and MFA verification. Query caches/native tab state reset when the authenticated account changes. Exact-SHA CI and live instance verification remain required.
