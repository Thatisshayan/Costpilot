# CostPilot launch handoff

Updated 2026-11-04. Branch: `docs/fix-doc-drift`. Review: [PR #7](https://github.com/Thatisshayan/Costpilot/pull/7). **Public release remains blocked pending live environment acceptance and Shayan approval.**

## What is implemented

The core release supports Clerk authentication, personal/shared expense CRUD, scoped projects/platforms, workspace invitations, and CSV/PDF exports. Native clients support personal expense CRUD; shared-workspace management uses the web app. Preview AI/provider automation/payments/telemetry routes are disabled and provider jobs do not run. The dashboard uses recorded amounts grouped by currency, without conversion or fabricated data.

Security work includes bearer-only production auth, CSRF handling, active membership/write-role checks, same-scope references, account cache isolation, foreign-origin token protection, transactional invitation creation/consumption, replay-safe Clerk provisioning, and refusal to delete nonempty workspaces. Runtime work includes Node 22.13+, pnpm 9.15.9, supported Clerk/Expo SDKs, frozen installs, generated contracts, migration/restore rehearsal, monitoring redaction and graceful shutdown. Shayan approved removing the stale npm lockfile; pnpm is canonical.

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
