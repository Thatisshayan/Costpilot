# CostPilot launch handoff

Updated 2026-11-05. Baseline: `main` at `19c4e04` (PR #7 merged). Earlier sections below are the historical handoff record. **Public release remains blocked pending live environment acceptance and Shayan approval.**

## Engineering baseline — `main` at `19c4e04` (2026-11-05)

`main` is the new baseline. PR #7, with PRs #8–#11 folded in, is merged; all required CI passed on the exact head, and `main` CI is green. See [main baseline audit](../../audits/2026-11-05_Claude_MainBaseline_Audit.md).

| Verified technical work (CI and disposable databases) | Not yet verified (live acceptance) |
| --- | --- |
| Clerk bearer auth; workspace isolation; invite tokens hashed (escalation fixed) | Real Clerk staging sign-in with two accounts |
| Expense validation; refunds labelled; per-currency cent-exact totals; single-scope CSV/PDF export | Physical-device mobile testing |
| Personal-only mobile; HTTPS-only release sessions | Deployed CORS, webhook delivery, monitoring alerts |
| Migrations, duplicate guard, backup/restore, container smoke | Real backup/restore on approved hosting |
| Fail-closed gitleaks over every introduced commit; exact-fingerprint exceptions | Hosting, region and budget approval; operator identity; reviewed legal pages |
| pnpm 10.34.7 with minimumReleaseAge enforced; zero audit advisories | Disposition of 5 unidentified Codacy findings |

Publishing is manual only. Merging to `main` does not deploy, and no production migration or paid service exists. Proposed designs awaiting approval: [hosting](../design/HOSTING_OPTIONS.md) and [AWS cost integration v1](../design/AWS_COST_INTEGRATION_V1.md).

## What is implemented

The core release supports Clerk authentication, personal/shared expense CRUD, scoped projects/platforms, workspace invitations, and CSV/PDF exports. Native clients support personal expense CRUD; shared-workspace management uses the web app. Preview AI/provider automation/payments/telemetry routes are disabled and provider jobs do not run. The dashboard uses recorded amounts grouped by currency, without conversion or fabricated data.

Security work includes bearer-only production auth, CSRF handling, active membership/write-role checks, same-scope references, account cache isolation, foreign-origin token protection, transactional invitation creation/consumption, replay-safe Clerk provisioning, and refusal to delete nonempty workspaces. Runtime work includes Node 22.13+, pnpm 10.34.7 (supply-chain settings enforced; see the [pnpm 10 audit](../../audits/2026-11-05_Claude_Pnpm10Hardening_Audit.md)), supported Clerk/Expo SDKs, frozen installs, generated contracts, migration/restore rehearsal, monitoring redaction and graceful shutdown. Shayan approved removing the stale npm lockfile; pnpm is canonical.

## Verified evidence

The ab017b0 checkpoint passed all of these:

- [Governance](https://github.com/Thatisshayan/Costpilot/actions/runs/41947753763): `bash scripts/verify.sh` including scan/docs/frozen install/build/typecheck; 138 API tests and 43 web/client tests.
- [Contracts and native export](https://github.com/Thatisshayan/Costpilot/actions/runs/41947747115): deterministic generation, committed diff check, full build/tests, native lint tooling and Android export.
- [Database/container rehearsal](https://github.com/Thatisshayan/Costpilot/actions/runs/41947753723): repeated migrations, isolation/roles/revocation, concurrent invitations, backup/restore, production container with actual RSA verification, expired/foreign/query-token rejection, signed webhook replay, CRUD and CSV/PDF.
- [API/DB CI](https://github.com/Thatisshayan/Costpilot/actions/runs/41947753729).

The latest lockfile audit reports **zero advisories at every severity**. Run `pnpm audit --audit-level=moderate` to reproduce. Subsequent configuration/docs and review fixes require green checks on their exact final commit; inspect PR checks before merging. Android export does not certify physical-device behavior or app-store readiness.

## Configuration already supplied

The authorized Clerk **test** publishable key is configured in ignored web/mobile `.env.local` files and GitHub's `VITE_CLERK_PUBLISHABLE_KEY` variable. No key value is committed. Shayan approved **Obsidianmedia.yt@gmail.com** for privacy/support; it is in the draft notice and ignored local preflight environment.

## What Shayan needs to provide or configure

| Item | What it means | Where it belongs |
| --- | --- | --- |
| Web URL | Address where people open the dashboard, including any base path | **Approved:** `https://thatisshayan.github.io/Costpilot/`. Build base path is `/Costpilot/`; local allowed origins include its host. |
| API origin | Address serving `/api/healthz`; origin has no `/api` suffix | **Not provisioned**, confirmed by Shayan. Select/provision an approved API host before assigning this value. Set GitHub variable `VITE_API_ORIGIN` and mobile build variable `EXPO_PUBLIC_API_ORIGIN`. A historical Railway hostname in source is not approval to use/deploy that service. |
| Allowed web origin | Scheme and host of the web URL, without its path | Server `ALLOWED_ORIGINS` and matching Clerk instance/domain configuration. For Pages the origin would be `https://thatisshayan.github.io`. |
| Public operator name | Person/company responsible for the service | Reply with approved display/legal name; complete terms/privacy review before signup opens. Contact is already supplied. |
| Clerk server key | Secret for the same instance as the supplied client key | Configure `CLERK_SECRET_KEY` privately in the API host; do not post it in chat or commit it. Confirm Native API is enabled for mobile. |
| Clerk webhook secret | Signing secret for Clerk delivery to the API | Configure `CLERK_WEBHOOK_SIGNING_SECRET` privately; endpoint is `/api/webhooks/clerk`. Rehearse delivery from the real instance. |
| Database/key custody | Application database and persistent encryption master key | Server `DATABASE_URL` and `KMS_MASTER_KEY` or `ENCRYPTION_KEY` (64 hex characters), stored privately with approved recovery custody. Do not generate a new key for an existing encrypted database. |
| Operations policy | On-call owner, hosting region, retention/deletion/backup policy, monitoring provider and recovery objectives | Approve decisions in the release runbook, then verify monitoring and a real backup restore. |

Root `.env` is for local server configuration. Client `.env.local` files are separate. Public client values are embedded at build time and require a rebuild when changed. Server secrets belong in the host's environment/secret store; use GitHub Secrets only for workflows that actually require them. All credentials/configuration must target the same staging instance.

## Claude takeover — 2026-11-05

Engineering responsibility moved from Codex to Claude. PR #7 review blockers are fixed on `agent/claude/pr7-blocker-fixes` (focused PR into `docs/fix-doc-drift`); see the [audit](../../audits/2026-11-05_Claude_PR7BlockerFixes_Audit.md). Pages publishing is now manual (`workflow_dispatch` + `publish` confirmation + `github-pages` environment). The local test identity needs `AUTH_TEST_BYPASS=1` on a development/test runtime. Open owner decisions: PR merges, hosting provider/region/budget (Pages terms exclude commercial SaaS), negative-amount policy, REPO_RULES secret-scan wording (R25), the history-scan false positive, and merging the pnpm 10.34.7 upgrade (`agent/claude/pnpm10-hardening`, separate PR) that makes `minimumReleaseAge` effective.

## Resume checklist

1. Inspect `git status`, current branch and PR checks. Preserve user `.claude` configuration and ignored private audit/install artifacts. Do not delete files without Shayan approval.
2. Read [REPO_RULES.md](../../REPO_RULES.md), [LAUNCH_PLAN.md](LAUNCH_PLAN.md), [DEFERRED_WORK.md](DEFERRED_WORK.md) and [execution evidence](../../audits/2026-11-04_Codex_LaunchExecution_Audit.md). Prefer the codebase-memory graph for discovery; project key is `D-AgentDevWork-repos-Costpilot`.
3. Resolve any final exact-SHA CI failures; keep generated clients synchronized through Orval, never hand-edit them. The two targeted glob/minimatch security overrides require native lint and Android export verification, which passed at the verified checkpoint.
4. Run the names/status-only `scripts/launch-preflight.mjs` with server and client environment files loaded. It must pass with approved staging origins and key configuration.
5. Follow [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md) for real two-account web/device sign-in, CRUD, shared roles/revocation, sign-out/expiry, Pages base-path routing, CORS, actual webhook delivery and monitoring. No billable operation is authorized merely by this document.
6. Record exact commit/URL/time and outcomes. Obtain Shayan's approval before merge, production migration, release or paid deployment. Do not report launch ready while these gates remain open.

## Local verification limitations

The host currently has Node 25 and an older installed module tree; target validation is on Node 22 CI. Local Docker engine/API errors and refused PostgreSQL connections prevented a local database/container run. Remote CI successfully ran disposable PostgreSQL 16, restore and production-container verification. An isolated install attempt and other diagnostics remain ignored under `audits/private/`; they are retained, not silently deleted. No production migration or deployment occurred.

## Latest operator decisions

Shayan approved the existing GitHub Pages URL and confirmed **the API host is not set up yet**. This prevents live protected-request acceptance. Existing Railway configuration can be prepared/reviewed, but creating an API/database or starting a billable service requires explicit spend approval. No host was provisioned. Web builds create a same-entry `404.html` fallback for Pages direct links; Pages may return HTTP 404 for those URLs while the application renders. Actual deployed routing still requires acceptance. The public operator name is still missing.

## Prepared API deployment definition

Both `railway.json` and `railway.staging.json` now define the API service using Railway's actual config-as-code schema: Node 22 Dockerfile, `/api/healthz`, failure restart policy and shutdown draining. The previous staging file incorrectly modeled multi-service provisioning, used unsupported `NODE_ENV=staging`, and probed `/api/health`; those settings are corrected. Files were validated against the [official Railway schema](https://railway.com/railway.schema.json). This service configuration does **not** create PostgreSQL/Redis or configure secrets. The core release requires PostgreSQL 16; Redis is not required by the enabled core routes. Configure `NODE_ENV=production` even for staging (to exercise production auth restrictions), the server variables above, and the approved origin privately in the host. Choose the reviewed branch/commit explicitly and apply migrations only after backup/preflight and approval. No automatic migration hook is configured.

## Restart checkpoint — user-requested machine restart

All implementation and configuration preparation through **b457c746de0ad8387bc4813a6d45e12800283b51** is committed and pushed to `origin/docs/fix-doc-drift`; [PR #7](https://github.com/Thatisshayan/Costpilot/pull/7) is open. This checkpoint document is committed immediately afterward. Resume from the remote branch head, not an earlier audit commit. The tracked working tree was clean before this checkpoint.

CI snapshot for b457c74 at checkpoint time:

- **Passed:** [API/DB CI 41948997466](https://github.com/Thatisshayan/Costpilot/actions/runs/41948997466), [governance 41948997432](https://github.com/Thatisshayan/Costpilot/actions/runs/41948997432).
- **Still running, not claimed passed:** [launch rehearsal 41948997567](https://github.com/Thatisshayan/Costpilot/actions/runs/41948997567), [CI 41948997608](https://github.com/Thatisshayan/Costpilot/actions/runs/41948997608), [contracts/native/Pages verification 41948994358](https://github.com/Thatisshayan/Costpilot/actions/runs/41948994358), [push governance 41948994357](https://github.com/Thatisshayan/Costpilot/actions/runs/41948994357). They run on GitHub independently of the machine restart. The checkpoint commit also triggers fresh checks; inspect those on resume.

Immediate resume actions:

1. Read this document and REPO_RULES.md; inspect the remote branch/PR and latest CI. Fix any failed checks before merge. Code discovery graph project: `D-AgentDevWork-repos-Costpilot`.
2. Preserve ignored client/server environment files, user `.claude` configuration and `audits/private/` diagnostics. No secret/key values are in this handoff. The supplied Clerk test key is configured locally and in the GitHub public build variable.
3. User decisions: existing GitHub Pages URL is approved; privacy/support contact is **Obsidianmedia.yt@gmail.com**; **API host is not set up yet**. The public operator name, hosting/region/budget decision, server webhook/encryption configuration and live acceptance are outstanding.
4. Latest status-only preflight: database/server Clerk key/allowed origins/client public keys/contact present; **API origins, Clerk webhook secret and encryption master key missing or invalid**. Presence checks do not prove real connectivity or matching Clerk configuration. Do not invent an API URL, rotate an existing encryption key blindly, or provision paid infrastructure without approval.
5. Once an approved API/PostgreSQL host exists, configure the variables in the table above, apply migrations with the runbook approvals, and perform actual web/device/CORS/webhook/monitoring checks. Public release remains blocked until these pass and Shayan approves.

Local Windows Node is 25; target CI/Docker is Node 22.13+. Existing installed modules are older; use CI evidence or an isolated Node 22 setup instead of silently replacing the user's module tree. The repo now pins pnpm 10.34.7; use `corepack enable` (or `npm install -g pnpm@10.34.7`). The previously cached pnpm 9 CLI must not be used: it ignores the supply-chain settings in `pnpm-workspace.yaml`. Local Docker/PostgreSQL were unhealthy/unavailable, while disposable remote rehearsals passed at prior checkpoints. Do not treat that as production evidence.

No merge, release, production migration, infrastructure provisioning or paid provider call occurred. Work is checkpointed for the user's restart; do not assume background local processes survive it.
