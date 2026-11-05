# Release and recovery runbook

Public release requires Shayan's approval on the exact tested commit. Preparing a release does not authorize paid provider calls, a billable deploy, or production database changes.

## Supported release surface

The current implementation enables authentication, personal/shared expenses, scoped platform/project records, workspace creation/invitations, and expense exports. The dashboard reads recorded expenses and never substitutes sample spending. Currency amounts are not converted or added across currencies. Preview screens remain in source but are unavailable through launch navigation/routes. Provider automation, payments, receipt AI, telemetry proxying and simulated remediation are disabled. Background provider jobs are not started by the API process.

API writes use explicit bearer credentials. Cookie-based writes still require a matching CSRF token. Active members can read shared expenses/projects/platforms; owners/admins can write. Workspace assignment is immutable. Invitations are random bearer capabilities: a signed-in account explicitly accepting a valid token receives its role, independent of an unverified email claim. Tokens must be shared privately; acceptance locks and consumes the invite transactionally.

## Configuration and staging

1. Configure server DATABASE_URL, CLERK_SECRET_KEY, CLERK_WEBHOOK_SIGNING_SECRET, ALLOWED_ORIGINS and either KMS_MASTER_KEY or ENCRYPTION_KEY (64 hex characters). Keep secrets in the deployment environment. Clerk must target the intended instance and authorized domains. Configure optional SENTRY_DSN only after approving the monitoring provider.
2. Set repository variables VITE_CLERK_PUBLISHABLE_KEY and VITE_API_ORIGIN for Pages. Mobile uses EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY and EXPO_PUBLIC_API_ORIGIN, and needs the Clerk Native API setting. Origins must be HTTPS for a public environment and must not contain `/api`; clients append API paths. Add the actual web origin to ALLOWED_ORIGINS.
3. Run `node --env-file=.env scripts/launch-preflight.mjs`. This prints variable names and status only. Supply an approved PRIVACY_CONTACT_EMAIL; the draft legal pages require owner review of the operator identity, data practices, retention, contacts and terms before launch.
4. Run `bash scripts/verify.sh` or `pwsh scripts/verify.ps1`, contract generation, the dependency audit and `docker build -f Dockerfile.verify -t costpilot-launch-verify .`. All required/security checks must pass; a build does not prove live authentication or monitoring delivery.
5. Rehearse fresh and repeated migrations against a disposable PostgreSQL 16 database named costpilot_launch_rehearsal, then `pnpm --filter @workspace/db run rehearsal` with LAUNCH_REHEARSAL_DATABASE_URL. CI provisions this service; it does not access a production database.
6. Verify two real staging accounts on web and a physical device: sign-in, create/edit/delete, workspace selection, viewer rejection, membership revocation, sign-out and expiry. Verify deployed Pages base-path navigation and cross-origin CORS. Trigger a synthetic non-sensitive error and confirm approved monitoring delivery. Record URL, commit, time and results without secrets.

## Database migration and restore

- Generate and review migrations in development. `pnpm --filter @workspace/db run migrate` applies committed versions; never use schema push or generate migrations against production during release.
- Before applying the new membership unique index to existing data, check for duplicate `(workspace_id,user_id)` rows. Resolve duplicates with the operator's approval; the migration must fail rather than silently deleting data. New databases receive the missing invites/budgets tables and membership columns through migration 0001.
- Take a PostgreSQL custom-format backup with the operator's approved backup tooling. Record the backup ID, encryption/custody, timestamp and restore objective. Restore to a newly created isolated database, never over the live database. Compare row counts and a known ledger export, then run the rehearsal there. CI's restore fixture checks mechanics; it does not prove a production backup or retention promise.
- Keep the previous API image and release commit. For application rollback, redeploy the previous tested image after checking migration compatibility. Prefer forward schema fixes; destructive/down migrations require separate review. Re-run health and protected-request smoke checks after rollback.
- Initial acceptance targets: 1,000 fixture expenses with 5 concurrent list requests, p95 under 1,500 ms in the disposable rehearsal; zero access-control failures. Larger production-volume and provider sync load claims require separate measured evidence.

## Incident ownership and unresolved operational decisions

Shayan must confirm the production/on-call owner, support/privacy contact, backup frequency and retention, recovery objectives, approved monitoring provider, and hosting region. No fixed uptime, compliance, retention or recovery guarantees may be published without that evidence. On a release failure, stop rollout, preserve logs without credentials, restore the last tested application version and verify data integrity before reopening traffic.
