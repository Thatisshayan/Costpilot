# PR #7 blocker fixes — 2026-11-05

- **Agent:** Claude (taking over from Codex)
- **Branch:** `agent/claude/pr7-blocker-fixes`, based on PR #7 head `4f89ea373506b10fe5cd453f1f4e3e51a46cb447` (`docs/fix-doc-drift`). Targets `docs/fix-doc-drift`, not `main`.
- **Last code commit:** `4eef218`. This audit and the doc updates come in the next commit. Exact-SHA CI results are on the PR.
- **Scope:** fixes for the independent PR #7 review findings that the owner approved. No merge, deploy, infrastructure, production migration, provider/payment activation or file deletion took place.

## Findings fixed

| ID | Severity | Finding (confirmed on 4f89ea3) | Fix | Evidence |
|---|---|---|---|---|
| F1 | P0 | `GET /workspaces/:id/members` was open to viewers and returned `userId: "pending-<invite token>"`. A viewer could redeem an admin invite from a second account. Reproduced against PostgreSQL before fixing. | Only SHA-256 digests of tokens are stored (invites and pending members). The pending placeholder `userId` is a random UUID. Viewers see active members only. Removing a pending member revokes its invite. A missing pending row returns 400, not 500. | `routes/workspaces.ts`, `lib/invite-token.ts`. Rehearsal covers owner/admin/viewer/nonmember invite rights, token non-disclosure in responses and at rest, legitimate admin acceptance, replay, an unknown token, expiry, revocation, a viewer holding a live admin token (409, role unchanged), and admin-cannot-remove-admin. |
| N1 | P0 | `deploy.yml` published Pages on every push to `main`. | `workflow_dispatch` only, with a typed `publish` confirmation, the `github-pages` environment (required reviewers configurable in repo settings) and serialized runs. No other workflow deploys. | `.github/workflows/deploy.yml` |
| N6 | P0 | Editing a platform saved the mask `••••••••` as the new encrypted key. | Omitted `apiKey` keeps the stored value. `null` clears it explicitly. Blank or mask strings get 400. Responses never decrypt: `?reveal=true` no longer returns plaintext, because provider sync is disabled. The launch UI no longer collects keys or shows the disabled sync control. `PlatformUpdate.apiKey` is nullable in OpenAPI and clients were regenerated. Stored ciphertext and keys are untouched. | `routes/platforms.ts`, `pages/platforms.tsx`. Unit tests cover unchanged/replaced/cleared/masked/create-with-mask/no-decrypt. The rehearsal asserts byte-identical ciphertext after an unrelated edit and an explicit clear. |
| F2 | P0 | `x-user-id` (and `?simulatedUserId=`) impersonation was active whenever `NODE_ENV !== "production"`; NODE_ENV defaults to development. | Requires `AUTH_TEST_BYPASS=1` plus NODE_ENV development/test plus a non-`sk_live_` Clerk key. The query form is removed. `validateEnv` refuses to start with the opt-in in production or with a live key. | `middlewares/auth.ts`, `lib/env.ts`. Tests cover missing opt-in across development/test/staging/unset, production with opt-in, live key, query form, and the startup guard. |
| N3 | P1 | Migration 0001 created the membership unique index with no duplicate check. | A `DO $$` guard raises an actionable message, including the query to list duplicates. The migration transaction rolls back and no rows change. 0001 has never been applied to a real database. | `lib/db/migrations/0001_eager_makkari.sql`. The new `rehearsal:migration-guard` applies 0000, then proves the duplicate case fails with the guard message, keeps both rows and rolls back 0001 entirely, and that a clean database migrates twice with the index enforced. Wired into CI. |

## Additional fixes approved in the same batch

- **Money validation.** Currency is trimmed and uppercased, must be 3 letters, and is stored that way. Dates must be real `YYYY-MM-DD` dates. Amounts allow at most 2 decimals and `|amount| ≤ 99,999,999.99`. Previously the database silently rounded extra decimals and returned 500 on overflow. **Negative amounts are still allowed** (refunds/credits); this is an owner decision. The rules are in OpenAPI and the clients were regenerated. Dashboard totals group by normalized code and sum in integer cents. Currencies are still never combined. `formatCurrency` no longer shows `$` for unknown codes.
- **Mobile scope.** Release builds refuse to send a session over non-HTTPS origins. The list shows personal expenses only. The edit screen refuses shared expenses. This is client-side scoping; the API still lets owners/admins edit shared records from any client, which is intended for web.
- **Export.** Export CSV/PDF buttons on the web Expenses page call the existing `/exports/generate` endpoint. The endpoint now takes an optional `workspaceId`: omitted or null means personal only; an id means that workspace only and requires active membership (403 otherwise). Previously one export mixed every visible scope with no scope column. Filenames now name the scope and date. The PDF states that amounts are not converted or totalled. The endpoint is now in OpenAPI.
- **Batch import (CodeRabbit nitpick).** Membership and reference checks are reused per workspace/reference within one request: 2 queries instead of about 1,000 for a 500-row single-scope import. Every row is still checked. A test asserts the query count and the viewer/nonmember/invalid-row denials.
- **Smaller fixes.**
  - Expense DELETE returns 404 when nothing was deleted.
  - The ⌘ mojibake in the web navigation is fixed.
  - `customFetch` (generated hooks) applies the configured-origin check before obtaining a token.
  - CSV neutralizes cells that start with a tab or CR.
  - Every production 5xx message is hidden, not just 500.
  - CORS rejections return 403 instead of 500.
  - `PATCH /projects/:id` with no body returns 400 instead of 500.
- **CI.** The PostgreSQL rehearsal and API/DB CI now run on every PR, so stacked PRs get exact-commit evidence.

## CodeRabbit threads (re-verified on 4f89ea3)

- Fixed here: layout mojibake, mobile HTTPS, batch-import queries, migration duplicate check.
- Already resolved in source before this branch: `sentry.ts` arity, nullable expense references, workspace-delete reclassification (409 under lock). The remaining 13 threads were already fixed in current source.

## Verification (local, Node 22.23.4, pnpm 9.15.9, disposable PostgreSQL 16.15)

- `bash scripts/verify.sh` stages: doc-freshness, frozen install, full build/typecheck, tests. Result: **VERIFY PASSED**, with the secret-scan stage run separately; see below.
- Tests: API **173/173**, web/client **53/53**, `@workspace/db` **28/28**. `pnpm run typecheck`, the mobile `typecheck` and `typecheck:libs` are clean.
- Contracts: Orval regeneration matches the committed `lib/*/src/generated` exactly. Orval also appends one line to the hand-written `lib/api-zod/src/index.ts`, which CI does not diff; that line is not committed.
- PostgreSQL: migrate twice, then the full `rehearsal` (including the new invite, credential, money and export-scope sections) **passed**. List p95 was 86–106 ms for 1,000 expenses at concurrency 5. `rehearsal:migration-guard` passed both scenarios.
- `pnpm audit --audit-level=moderate`: no known vulnerabilities.
- Gitleaks 8.21.2 (release checksum verified):
  - The 10 commits on this branch and the working tree have **no leaks**.
  - A full-history scan reports 2 `generic-api-key` hits at `.env.example:13` and `.env.template:13` in Codex commit `9594a50`. The value is a 33-character non-hex "replace…" placeholder, later blanked. No ignore rule was added; adding one needs owner review.
  - **CI gap:** the gate's checkout is shallow, so CI scans only the head commit of each push.
- **Not run here:** Docker production-container smoke and Android export. These run in CI on this PR. No live Clerk, device, browser, staging or monitoring checks; those remain release-acceptance gates.

## Supply chain

`minimumReleaseAge: 1440` in `pnpm-workspace.yaml` is **not enforced**. The pinned pnpm 9.15.9 contains no implementation of it (no reference in its dist); support starts in pnpm 10.16. The other settings in that file are also not read by pnpm 9. Overrides take effect only because they are duplicated in `package.json` `pnpm.overrides`. The file comment now says this.

Recommended remediation, as a separate PR: move `packageManager`, workflows and Dockerfiles to a pinned pnpm ≥ 10.16. That means reviewing pnpm 10's blocked-by-default lifecycle scripts (`onlyBuiltDependencies`/allow-build settings), regenerating nothing beyond what pnpm requires, keeping `--frozen-lockfile`, and proving it with full CI and Android export.

## Governance notes

- PR #7 changes REPO_RULES Appendix B secret-scan text to: "gitleaks is required. CI installs it; local verification fails closed when it is unavailable. No weaker grep fallback is accepted." Under R25, rule changes go through branch/PR/CI and the file owner is Shayan, so the owner's merge approval should explicitly cover this rule change. This branch does not modify REPO_RULES.md.
- PR #7 claims that Shayan approved removing `package-lock.json` (Rule 14). The owner should confirm this before merge.

## Remaining risks

- Live acceptance (real Clerk staging, two accounts, device, CORS, webhook delivery, monitoring, backup restore) has not been performed.
- No API host exists. GitHub Pages terms exclude commercial SaaS; see the owner report.
- The negative-amount policy is pending an owner decision.
- `minimumReleaseAge` is unenforced until the pnpm upgrade.
- CI secret scanning is shallow.
- The gitleaks history false positive needs an owner decision: a fingerprint-specific ignore or accept.
- Invites are bearer capabilities not bound to email; this was Codex's documented design.
- Existing plaintext invite tokens in any pre-existing database would stop working after this change. No such database is known to exist.

## Follow-up — Codacy, legacy invites, refunds (same day)

- **Codacy high-severity security issues (PR #8): 2 at `24ea6a3`, 3 at `5fecb48`. UNRESOLVED; details unknown. Not classified as false positives.** Owner accepted merging PR #8 into `docs/fix-doc-drift` with these open; they block public launch until investigated. Earlier notes: the rule IDs and lines are **not retrievable from this session**; `app.codacy.com` is outside the environment's allowed network domains. Local reproduction of Codacy's usual engines on the changed files:
  - Semgrep open-source JavaScript/TypeScript rules: no security findings.
  - ESLint `eslint-plugin-security`: new lines flagged are `detect-non-literal-fs-filename` ×2 (`lib/db/scripts/migration-guard-rehearsal.ts:25,27`, temp-dir paths, CI-only script, no external input) and `detect-object-injection` (export helper, now rewritten without a lookup; an auth test; generated client).
  - Trivy was not run: downloading its binary was blocked by this session's safety policy.
  - **The exact Codacy findings remain unconfirmed.** Do not treat PR #8 as Codacy-clean until they are read.
- **Legacy plaintext invites:** lookups now hash the presented token, so a token stored before this change matches nothing: lookup returns 404, accept returns 400, and the row stays hidden from viewers. Removing its pending member expires it. This was proven in the PostgreSQL rehearsal. No database with such rows is known to exist; if one is found, expire its pending invites and re-issue them.
- **Refunds/credits (owner decision: keep negatives):**
  - Forms take a positive amount plus an explicit type.
  - Lists and dashboard label credits, and totals are labelled net.
  - CSV adds a Type column; PDF rows are suffixed.
  - No conversion.
- **Secret-scan correction:** pull-request runs check out one merge commit, so gitleaks scans a snapshot of the current tree, not each introduced commit. The recommended range-scan strategy is in the owner report; it is not implemented here because it makes PR #7's range include the `9594a50` placeholder and needs an owner decision on a fingerprint-specific allowlist.
