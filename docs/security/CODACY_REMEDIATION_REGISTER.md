# Codacy remediation register

**Status:** 2026-11-05. This is the single register for every Codacy finding. Each finding is marked **Fixed**, **Verified False Positive**, **Not Applicable**, **Deferred With Reason** or **Pending Investigation**.

## Source

The owner exported the repository issue list from the Codacy dashboard: 345 findings (34 critical, 155 high, 156 medium). Each finding was parsed and checked against the code:

- **Present on `main`:** the first flagged line was located in `origin/main`.
- **Origin:** `git blame` on `main`, matched to the commits of PR #8 and PR #9.
- **Reachability:** from `scripts/mock-guard.mjs`, which lists every file reachable from the web, API and mobile entry points.

**All 345 findings exist on `main` (`611b966`).** None is code introduced by PR #14.

## Reconciliation

| Set | Result |
|---|---|
| **5 historical unresolved findings** (3 new high on PR #8, 2 on PR #9) | **Identified by `git blame`; this supersedes the PR #8 and PR #9 "unidentified" entries in `DEFERRED_WORK.md`.** PR #8: findings 24 and 99 (`0001_eager_makkari.sql` lines 36–37: Oracle `RAC_*` rule, Not Applicable) and 86 (`routes/exports.ts` export loop, **Fixed** by the 50,000-row cap in PR #16). PR #9: findings 119 and 179 (`scripts/secret-scan.mjs`: existsSync on a fixed report path and a log line; Verified False Positive). |
| **25 new findings on PR #14** (1 critical, 19 high, 5 medium) | **Accepted residual risk — internal development merges only.** See the next section. |
| **1 new finding on PR #15** (1 high) | **Accepted residual risk — internal development merges only.** See the next section. |
| **New findings on PR #16** (12 at `188917c`: 10 high, 2 medium; 0 after retargeting to `main` at `fcfed09`; **4 high Security at `067a440`**, after the CodeRabbit fixes) | **Accepted residual risk — internal development merges only.** See the next section. |
| **Repository backlog** | The 345 findings below |

### Unidentified PR findings: accepted residual risk

On 2026-11-05 the owner accepted these findings as residual risk **for merging internal development code only**. This is not approval for production or external customer access, and none of them is classified as a false positive.

| PR | Reported by Codacy | Status | Identification limitation |
|---|---|---|---|
| #14 Batch 1 trustworthy core | 25 new: 1 critical, 19 high, 5 medium | Accepted residual risk (internal merges only) | Codacy's PR issue list is not reachable from the agent environment (`app.codacy.com` and `api.codacy.com` are blocked; no Codacy connector). A local ESLint/Semgrep approximation did not reproduce the count. Rule, file and line are unknown. |
| #15 Security remediation | 1 new: high | Accepted residual risk (internal merges only) | Same limitation. |
| #16 Batch 2 monthly dashboard | 12 new (10 high, 2 medium) at `188917c`; 0 at `fcfed09` against `main`; **4 new high (Security) at `067a440`** | Accepted residual risk (internal merges only); reported to the owner as newly appeared before merging | Same limitation. A manual review of the `fcfed09..067a440` changes found no new request input, SQL built from input (all values are bound parameters), HTML sink or unbounded regex. Not classified as false positives. |
| #18 Batch 3A budgets (not merged) | 13 new at `212280b`: 1 critical, 11 high (Security), 1 medium (Complexity) | **Open — not accepted.** Must be identified and triaged before this PR merges; the owner decides | Same limitation. An independent agent review of the budget code found no critical or high issue (authorization re-checked inside the write statements, every SQL value bound, exact BigInt money); that does not identify Codacy's findings. Not classified as false positives. |
| #19 Batch 3B CSV import (not merged, stacked on #18) | 0 new at `ba92579`-based head; **47 new at `9183b3d`**: 26 high (15 Security, 11 ErrorProne), 21 medium | **Open — not accepted.** Must be identified and triaged before this PR merges; the owner decides | Same limitation. The count changed after the budgets fixes were merged into this branch, so part of it may be attributed against the stacked base. An independent agent review found no critical or high issue in the import code. Not classified as false positives. |

Codacy stays enabled and its reports are kept. **Before any production or external access** these must be identified and triaged like the backlog below. To get each list:

1. In Codacy, open **Costpilot → Pull requests → #N → Issues**, keep the **New** filter, then export the list.
2. Or use Codacy's API with a token (never paste the token into chat):
   `curl -H "api-token: $CODACY_TOKEN" "https://api.codacy.com/api/v3/analysis/organizations/gh/Thatisshayan/repositories/Costpilot/pull-requests/N/issues?status=new&limit=100"`
3. Or allow `app.codacy.com` and `api.codacy.com` in this environment's network settings.

## Summary

| Severity | Fixed | Verified False Positive | Not Applicable | Deferred With Reason | Pending |
|---|---|---|---|---|---|
| Critical | 4 | 10 | 18 | 2 | 0 |
| High | 11 | 20 | 42 | 82 | 0 |
| Medium | 0 | 0 | 137 | 19 | 0 |
| **Total** | **15** | **30** | **197** | **103** | **0** (plus 38 unidentified PR findings, accepted residual risk above) |

**Live-code findings.** No critical or high finding in reachable production code is left unexplained.
- **Fixed in PR #15:**
  - credential decryption accepted truncated GCM tags;
  - the webhook secret comparison was not constant-time.
- **Fixed in PR #16 (Batch 2):** the unbounded export size (finding 86): exports are capped at 50,000 rows and return 413 above it.
- **The rest** are verified false positives, each with the evidence below.

**Deferred items** need an owner decision or a later PR:
- package-version ranges (exact pinning);
- code-quality refactors;
- local-only docker-compose hardening;
- two disabled modules: `notifications.ts` must restrict webhook URLs before it is ever enabled, and `encryption.ts` should be deleted.

**Rules:** no Codacy rule was suppressed, and no finding was silenced by cosmetic code changes.

## Reasons
- **R1** — Rule targets SQL Server/Oracle conventions (RAC_* tables, QUOTED_IDENTIFIER/ANSI_NULLS, table compression, schema-qualified names) that do not apply to PostgreSQL. Applied migrations are immutable and must not be rewritten.
- **R2** — Code not reachable from any enabled web route, API route or mobile screen (enforced by `scripts/mock-guard.mjs`); listed in `docs/product/LEGACY_CODE_INVENTORY.md` for retain/rewrite/delete decisions. Not fixed in place to avoid reviving disabled features.
- **R3** — Semver ranges in manifests; installs are reproducible from the committed `pnpm-lock.yaml` (`--frozen-lockfile` in CI and Docker), new versions must be 24h old (`minimumReleaseAge: 1440`) and `pnpm audit` runs in CI. Exact pinning in every manifest is a broad dependency change: owner decision.
- **R4** — CI/developer tooling over repository-controlled or localhost inputs (paths built from the repo root, a local test server over http://127.0.0.1, fixed log messages); never runs in the product.
- **R5** — Anchored regex with a single quantifier and no alternation/nesting (`/^Bearer \S+$/`, `/^https?:\/\//i`): linear time; header size is also capped by Node.
- **R6** — `pnpm/action-setup` pinned to commit `b906affc…` (the current `v4` = v4.3.0) in all 9 uses. security PR (`agent/claude/security-remediation`)
- **R7** — `artifacts/mockup-sandbox` is a component-preview sandbox, not a product surface; not built or deployed.
- **R8** — Unmounted route (not reachable). Real SSRF risk if enabled: before mounting, restrict webhook URLs to https and an allowlist (e.g. hooks.slack.com, discord.com) and block private address ranges. Recorded as a precondition in the legacy inventory.
- **R9** — Runtime stage now ends with `USER node`. Verified by the CI container smoke test. security PR (`agent/claude/security-remediation`)
- **R10** — GCM decipher now requires a 12-byte IV and full 16-byte tag (`authTagLength: 16`); truncated tags were accepted before. Errors in well-formed envelopes are no longer masked. Tests: `lib/db/src/kms.test.ts` (fail on old code, pass on new). security PR (`agent/claude/security-remediation`)
- **R11** — Generated lockfile size.
- **R12** — Response is `text/csv` with `Content-Disposition: attachment` and Helmet's `X-Content-Type-Options: nosniff`, so the browser downloads it and never renders it as HTML; every cell is quoted and formula-neutralised (`lib/csv.ts`). Rehearsal now asserts both headers.
- **R13** — Fixed fake value inside a unit test (never a real credential); the repository's gitleaks gate scans every commit and passes.
- **R14** — Shared secret compared with `crypto.timingSafeEqual` over SHA-256 digests (`secretsMatch`). Test: `webhooks.test.ts`. Route is also blocked by the launch scope today. security PR (`agent/claude/security-remediation`)
- **R15** — `fixture_value` is generated by `openssl rand -hex 32` in the same step, so it can only contain hex digits and cannot inject a workflow command.
- **R16** — Local development compose file only (not deployed). A read-only root filesystem for postgres/redis needs tmpfs mappings for runtime directories; revisit if compose is ever used beyond local development.
- **R17** — Fixed in PR #16 (Batch 2): exports are capped at `MAX_EXPORT_ROWS = 50_000` and return 413 with guidance to narrow the filters; the launch rehearsal checks that 50,001 rows return 413 and a narrowed export returns 200.
- **R18** — Documentation style (duplicate headings); low priority, fix in the code-quality PR.
- **R19** — Expo starter `reset-project.js`, never run by CI or the app; recommended for deletion (legacy inventory C).
- **R20** — Genuine unused import; removed in the follow-up code-quality PR (the same file changes in PR #14).
- **R21** — Length/complexity of a live component; refactor in the follow-up code-quality PR (several were restructured in PR #14 already). No security impact.
- **R22** — CommonJS `require` in an Expo ESLint config file, the format that tool expects.
- **R23** — Test code length/complexity; no runtime impact.
- **R24** — `REPO_RULES.md` exists at the repository root; the reference resolves.
- **R25** — Generated from OpenAPI by Orval; never hand-edited.
- **R26** — `shell` is enabled only on Windows for `.cmd` shims; the command and arguments are fixed literals from the script, never user input.
- **R27** — `security_opt: no-new-privileges:true` on postgres and redis. security PR (`agent/claude/security-remediation`)
- **R28** — shadcn chart: builds a `<style>` block from the developer-supplied `config` object (static colours), not user input. Not reachable in the live app today.
- **R29** — `Math.random()` only picks a skeleton placeholder width (cosmetic); no security use.
- **R30** — Browser-side client: server-side request forgery does not apply. Paths come from generated API functions; `assertConfiguredOrigin` prevents the bearer token from being sent to any origin but the configured API.
- **R31** — Mobile client: before `fetch`, the URL origin must equal the configured `API_ORIGIN` and release builds require HTTPS (`assertSecureApiOrigin`).
- **R32** — Unreachable legacy module (superseded by `kms-vault.ts`, imported only by its own test) that also falls back to a random key. Recommended for deletion (legacy inventory C, needs owner approval); must not be reused.

## Findings

| # | Severity | Rule | File:line | Origin | Reachable | Status | Reason |
|---|---|---|---|---|---|---|---|
| 32 | Critical | Cryptography | `artifacts/api-server/src/lib/kms-vault.ts:115` | main | reachable | Fixed | R10 |
| 311 | Critical | Cryptography | `artifacts/api-server/src/lib/kms-vault.ts:130` | main | reachable | Fixed | R10 |
| 344 | Critical | Cryptography | `artifacts/api-server/src/lib/kms-vault.ts:136` | main | reachable | Fixed | R10 |
| 343 | Critical | Cryptography | `artifacts/api-server/src/routes/webhooks.ts:91` | main | reachable | Fixed | R14 |
| 277 | High | Insecure Modules Libraries | `.github/workflows/ci-api-server.yml:44` | main | unreachable | Fixed | R6 |
| 100 | High | Insecure Modules Libraries | `.github/workflows/ci.yml:17` | main | unreachable | Fixed | R6 |
| 17 | High | Insecure Modules Libraries | `.github/workflows/deploy.yml:39` | main | unreachable | Fixed | R6 |
| 43 | High | Insecure Modules Libraries | `.github/workflows/gate.yml:25` | main | unreachable | Fixed | R6 |
| 270 | High | Insecure Modules Libraries | `.github/workflows/launch-rehearsal.yml:26` | main | unreachable | Fixed | R6 |
| 330 | High | Insecure Modules Libraries | `.github/workflows/launch-verify.yml:13` | main | unreachable | Fixed | R6 |
| 31 | High | Visibility | `artifacts/api-server/Dockerfile:48` | main | unreachable | Fixed | R9 |
| 61 | High | Insecure Modules Libraries | `artifacts/api-server/src/routes/webhooks.ts:91` | main | reachable | Fixed | R14 |
| 333 | High | Insecure Modules Libraries | `docker-compose.yml:4` | main | unreachable | Fixed | R27 |
| 246 | High | Insecure Modules Libraries | `docker-compose.yml:23` | main | unreachable | Fixed | R27 |
| 339 | Critical | Cryptography | `artifacts/api-server/src/lib/encryption.ts:39` | main | unreachable | Deferred With Reason | R32 |
| 19 | Critical | HTTP | `artifacts/api-server/src/routes/notifications.ts:85` | main | unreachable | Deferred With Reason | R8 |
| 297 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:55` | main | manifest | Deferred With Reason | R3 |
| 324 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:56` | main | manifest | Deferred With Reason | R3 |
| 84 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:57` | main | manifest | Deferred With Reason | R3 |
| 217 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:59` | main | manifest | Deferred With Reason | R3 |
| 338 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:61` | main | manifest | Deferred With Reason | R3 |
| 279 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:63` | main | manifest | Deferred With Reason | R3 |
| 11 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:65` | main | manifest | Deferred With Reason | R3 |
| 95 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:66` | main | manifest | Deferred With Reason | R3 |
| 69 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:67` | main | manifest | Deferred With Reason | R3 |
| 10 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:68` | main | manifest | Deferred With Reason | R3 |
| 13 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:69` | main | manifest | Deferred With Reason | R3 |
| 77 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:72` | main | manifest | Deferred With Reason | R3 |
| 90 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:73` | main | manifest | Deferred With Reason | R3 |
| 96 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:75` | main | manifest | Deferred With Reason | R3 |
| 314 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:76` | main | manifest | Deferred With Reason | R3 |
| 342 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:77` | main | manifest | Deferred With Reason | R3 |
| 204 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:81` | main | manifest | Deferred With Reason | R3 |
| 40 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:82` | main | manifest | Deferred With Reason | R3 |
| 9 | High | Insecure Modules Libraries | `artifacts/ai-tracker/package.json:83` | main | manifest | Deferred With Reason | R3 |
| 303 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:17` | main | manifest | Deferred With Reason | R3 |
| 261 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:18` | main | manifest | Deferred With Reason | R3 |
| 327 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:20` | main | manifest | Deferred With Reason | R3 |
| 20 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:21` | main | manifest | Deferred With Reason | R3 |
| 307 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:22` | main | manifest | Deferred With Reason | R3 |
| 5 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:23` | main | manifest | Deferred With Reason | R3 |
| 75 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:24` | main | manifest | Deferred With Reason | R3 |
| 91 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:25` | main | manifest | Deferred With Reason | R3 |
| 304 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:26` | main | manifest | Deferred With Reason | R3 |
| 73 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:27` | main | manifest | Deferred With Reason | R3 |
| 323 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:28` | main | manifest | Deferred With Reason | R3 |
| 27 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:29` | main | manifest | Deferred With Reason | R3 |
| 322 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:42` | main | manifest | Deferred With Reason | R3 |
| 49 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:43` | main | manifest | Deferred With Reason | R3 |
| 66 | High | Insecure Modules Libraries | `artifacts/api-server/package.json:45` | main | manifest | Deferred With Reason | R3 |
| 86 | High | Do S | `artifacts/api-server/src/routes/exports.ts:60` | PR8 | reachable | Fixed | R17 |
| 332 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:7` | main | manifest | Deferred With Reason | R3 |
| 319 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:8` | main | manifest | Deferred With Reason | R3 |
| 302 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:9` | main | manifest | Deferred With Reason | R3 |
| 78 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:10` | main | manifest | Deferred With Reason | R3 |
| 56 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:11` | main | manifest | Deferred With Reason | R3 |
| 53 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:12` | main | manifest | Deferred With Reason | R3 |
| 98 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:13` | main | manifest | Deferred With Reason | R3 |
| 93 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:14` | main | manifest | Deferred With Reason | R3 |
| 51 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:15` | main | manifest | Deferred With Reason | R3 |
| 336 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:16` | main | manifest | Deferred With Reason | R3 |
| 67 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:17` | main | manifest | Deferred With Reason | R3 |
| 337 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:18` | main | manifest | Deferred With Reason | R3 |
| 4 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:19` | main | manifest | Deferred With Reason | R3 |
| 317 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:20` | main | manifest | Deferred With Reason | R3 |
| 299 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:24` | main | manifest | Deferred With Reason | R3 |
| 26 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:26` | main | manifest | Deferred With Reason | R3 |
| 210 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:27` | main | manifest | Deferred With Reason | R3 |
| 202 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:28` | main | manifest | Deferred With Reason | R3 |
| 259 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:30` | main | manifest | Deferred With Reason | R3 |
| 85 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:36` | main | manifest | Deferred With Reason | R3 |
| 94 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:37` | main | manifest | Deferred With Reason | R3 |
| 45 | High | Insecure Modules Libraries | `artifacts/mobile-app/package.json:38` | main | manifest | Deferred With Reason | R3 |
| 62 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:46` | main | manifest | Deferred With Reason | R3 |
| 29 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:49` | main | manifest | Deferred With Reason | R3 |
| 329 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:50` | main | manifest | Deferred With Reason | R3 |
| 265 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:51` | main | manifest | Deferred With Reason | R3 |
| 341 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:52` | main | manifest | Deferred With Reason | R3 |
| 309 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:54` | main | manifest | Deferred With Reason | R3 |
| 284 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:56` | main | manifest | Deferred With Reason | R3 |
| 81 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:58` | main | manifest | Deferred With Reason | R3 |
| 35 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:60` | main | manifest | Deferred With Reason | R3 |
| 248 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:61` | main | manifest | Deferred With Reason | R3 |
| 335 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:62` | main | manifest | Deferred With Reason | R3 |
| 38 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:63` | main | manifest | Deferred With Reason | R3 |
| 320 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:66` | main | manifest | Deferred With Reason | R3 |
| 23 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:67` | main | manifest | Deferred With Reason | R3 |
| 64 | High | Insecure Modules Libraries | `artifacts/mockup-sandbox/package.json:68` | main | manifest | Deferred With Reason | R3 |
| 72 | High | File Access | `docker-compose.yml:4` | main | unreachable | Deferred With Reason | R16 |
| 334 | High | File Access | `docker-compose.yml:23` | main | unreachable | Deferred With Reason | R16 |
| 345 | High | Insecure Modules Libraries | `lib/api-client-react/package.json:14` | main | manifest | Deferred With Reason | R3 |
| 306 | High | Insecure Modules Libraries | `lib/api-spec/package.json:10` | main | manifest | Deferred With Reason | R3 |
| 325 | High | Insecure Modules Libraries | `lib/db/package.json:21` | main | manifest | Deferred With Reason | R3 |
| 63 | High | Insecure Modules Libraries | `lib/db/package.json:22` | main | manifest | Deferred With Reason | R3 |
| 44 | High | Insecure Modules Libraries | `lib/db/package.json:28` | main | manifest | Deferred With Reason | R3 |
| 34 | High | Insecure Modules Libraries | `lib/db/package.json:30` | main | manifest | Deferred With Reason | R3 |
| 48 | High | Insecure Modules Libraries | `package.json:18` | main | manifest | Deferred With Reason | R3 |
| 83 | High | Insecure Modules Libraries | `package.json:19` | main | manifest | Deferred With Reason | R3 |
| 55 | High | Insecure Modules Libraries | `package.json:23` | main | manifest | Deferred With Reason | R3 |
| 186 | Medium | Best practice | `Costpilot_Premium_UI_UX_Proposal.md:115` | main | unreachable | Deferred With Reason | R18 |
| 103 | Medium | Best practice | `Costpilot_UI_UX_Audit_Report.md:38` | main | unreachable | Deferred With Reason | R18 |
| 185 | Medium | Best practice | `Costpilot_UI_UX_Audit_Report.md:42` | main | unreachable | Deferred With Reason | R18 |
| 138 | Medium | Best practice | `Costpilot_UI_UX_Audit_Report.md:54` | main | unreachable | Deferred With Reason | R18 |
| 177 | Medium | Best practice | `Costpilot_UI_UX_Audit_Report.md:79` | main | unreachable | Deferred With Reason | R18 |
| 290 | Medium | Code complexity | `artifacts/ai-tracker/src/components/layout.tsx:114` | main | reachable | Deferred With Reason | R21 |
| 127 | Medium | Code complexity | `artifacts/ai-tracker/src/components/workspace-switcher.tsx:21` | main | reachable | Deferred With Reason | R21 |
| 203 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/accept-invite.tsx:7` | main | reachable | Deferred With Reason | R21 |
| 157 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/collaboration.tsx:1` | main | reachable | Deferred With Reason | R21 |
| 264 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/expenses.tsx:67` | main | reachable | Deferred With Reason | R21 |
| 272 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/platforms.tsx:49` | main | reachable | Deferred With Reason | R21 |
| 226 | Medium | Code complexity | `artifacts/api-server/src/routes/exports.ts:23` | main | reachable | Deferred With Reason | R21 |
| 228 | Medium | Code complexity | `artifacts/api-server/src/routes/webhooks.ts:164` | main | reachable | Deferred With Reason | R21 |
| 215 | Medium | Code complexity | `artifacts/mobile-app/src/app/add-expense.tsx:66` | main | reachable | Deferred With Reason | R21 |
| 250 | Medium | Code complexity | `artifacts/mobile-app/src/app/expenses.tsx:84` | main | reachable | Deferred With Reason | R21 |
| 153 | Medium | Code complexity | `artifacts/mobile-app/src/components/themed-text.tsx:11` | main | reachable | Deferred With Reason | R21 |
| 131 | Medium | Best practice | `docs/AUDIT_REPORT_2026-08-02.md:167` | main | unreachable | Deferred With Reason | R18 |
| 115 | Medium | Unused code | `scripts/verify.mjs:2` | main | script | Deferred With Reason | R20 |
| 145 | Medium | Unused code | `scripts/verify.mjs:2` | main | script | Deferred With Reason | R20 |
| 253 | Critical | XSS | `artifacts/ai-tracker/src/components/ui/chart.tsx:77` | main | unreachable | Verified False Positive | R28 |
| 251 | Critical | XSS | `artifacts/ai-tracker/src/components/ui/chart.tsx:80` | main | unreachable | Verified False Positive | R28 |
| 300 | Critical | Cryptography | `artifacts/ai-tracker/src/components/ui/sidebar.tsx:612` | main | unreachable | Verified False Positive | R29 |
| 47 | Critical | XSS | `artifacts/api-server/src/routes/exports.ts:65` | main | reachable | Verified False Positive | R12 |
| 331 | Critical | HTTP | `artifacts/mobile-app/src/lib/api.ts:52` | main | reachable | Verified False Positive | R31 |
| 310 | Critical | HTTP | `lib/api-client-react/src/custom-fetch.ts:98` | main | reachable | Verified False Positive | R30 |
| 340 | Critical | HTTP | `lib/api-client-react/src/custom-fetch.ts:385` | main | reachable | Verified False Positive | R30 |
| 243 | Critical | HTTP | `lib/db/scripts/launch-rehearsal.ts:26` | main | script | Verified False Positive | R4 |
| 7 | Critical | HTTP | `scripts/container-smoke.mjs:29` | main | script | Verified False Positive | R4 |
| 236 | Critical | Command Injection | `scripts/verify.mjs:11` | main | script | Verified False Positive | R26 |
| 71 | High | Command Injection | `.github/workflows/ci-api-server.yml:63` | main | unreachable | Verified False Positive | R15 |
| 183 | High | Error prone | `AGENTS.md:1` | main | unreachable | Verified False Positive | R24 |
| 114 | High | File Access | `artifacts/ai-tracker/scripts/prepare-pages.mjs:8` | main | script | Verified False Positive | R4 |
| 14 | High | Do S | `artifacts/api-server/src/middlewares/csrf.ts:16` | main | reachable | Verified False Positive | R5 |
| 57 | High | Insecure Storage | `artifacts/api-server/src/routes/__tests__/webhooks.test.ts:222` | main | test | Verified False Positive | R13 |
| 59 | High | Insecure Storage | `artifacts/api-server/src/routes/__tests__/webhooks.test.ts:222` | main | test | Verified False Positive | R13 |
| 262 | High | Do S | `artifacts/mobile-app/src/lib/api.ts:31` | main | reachable | Verified False Positive | R5 |
| 223 | High | Insecure Storage | `lib/db/src/kms.test.ts:11` | main | test | Verified False Positive | R13 |
| 315 | High | HTTP | `scripts/container-smoke.mjs:34` | main | script | Verified False Positive | R4 |
| 87 | High | HTTP | `scripts/container-smoke.mjs:39` | main | script | Verified False Positive | R4 |
| 46 | High | HTTP | `scripts/container-smoke.mjs:42` | main | script | Verified False Positive | R4 |
| 39 | High | HTTP | `scripts/container-smoke.mjs:47` | main | script | Verified False Positive | R4 |
| 136 | High | Insecure Modules Libraries | `scripts/launch-preflight.mjs:6` | main | script | Verified False Positive | R4 |
| 146 | High | Insecure Modules Libraries | `scripts/launch-preflight.mjs:7` | main | script | Verified False Positive | R4 |
| 167 | High | Insecure Modules Libraries | `scripts/launch-preflight.mjs:10` | main | script | Verified False Positive | R4 |
| 119 | High | File Access | `scripts/secret-scan.mjs:37` | PR9 | script | Verified False Positive | R4 |
| 179 | High | Insecure Modules Libraries | `scripts/secret-scan.mjs:54` | PR9 | script | Verified False Positive | R4 |
| 142 | High | File Access | `scripts/verify.mjs:23` | main | script | Verified False Positive | R4 |
| 134 | High | File Access | `scripts/verify.mjs:27` | main | script | Verified False Positive | R4 |
| 180 | High | Do S | `scripts/verify.mjs:34` | main | script | Verified False Positive | R4 |
| 15 | Critical | Cryptography | `artifacts/ai-tracker/src/pages/cost-centers.tsx:52` | main | unreachable | Not Applicable | R2 |
| 80 | Critical | Cryptography | `artifacts/ai-tracker/src/pages/cost-centers.tsx:61` | main | unreachable | Not Applicable | R2 |
| 12 | Critical | Cryptography | `artifacts/ai-tracker/src/pages/llm-router.tsx:32` | main | unreachable | Not Applicable | R2 |
| 2 | Critical | Cryptography | `artifacts/ai-tracker/src/pages/llm-router.tsx:33` | main | unreachable | Not Applicable | R2 |
| 230 | Critical | Cryptography | `artifacts/ai-tracker/src/pages/llm-router.tsx:41` | main | unreachable | Not Applicable | R2 |
| 328 | Critical | Cryptography | `artifacts/ai-tracker/src/pages/llm-router.tsx:52` | main | unreachable | Not Applicable | R2 |
| 42 | Critical | Cryptography | `artifacts/ai-tracker/src/pages/status.tsx:43` | main | unreachable | Not Applicable | R2 |
| 207 | Critical | Cryptography | `artifacts/ai-tracker/src/pages/status.tsx:47` | main | unreachable | Not Applicable | R2 |
| 206 | Critical | XSS | `artifacts/api-server/src/routes/analytics.ts:130` | main | unreachable | Not Applicable | R2 |
| 321 | Critical | XSS | `artifacts/api-server/src/routes/reports.ts:105` | main | unreachable | Not Applicable | R2 |
| 241 | Critical | Cryptography | `artifacts/api-server/src/routes/telemetry.ts:367` | main | unreachable | Not Applicable | R2 |
| 286 | Critical | Cryptography | `artifacts/api-server/src/routes/telemetry.ts:458` | main | unreachable | Not Applicable | R2 |
| 70 | Critical | Cryptography | `artifacts/api-server/src/routes/telemetry.ts:476` | main | unreachable | Not Applicable | R2 |
| 316 | Critical | File Access | `artifacts/mobile-app/scripts/reset-project.js:61` | main | script | Not Applicable | R19 |
| 271 | Critical | Command Injection | `artifacts/mockup-sandbox/src/App.tsx:40` | main | sandbox | Not Applicable | R7 |
| 60 | Critical | XSS | `artifacts/mockup-sandbox/src/components/ui/chart.tsx:76` | main | sandbox | Not Applicable | R7 |
| 18 | Critical | XSS | `artifacts/mockup-sandbox/src/components/ui/chart.tsx:79` | main | sandbox | Not Applicable | R7 |
| 208 | Critical | Cryptography | `artifacts/mockup-sandbox/src/components/ui/sidebar.tsx:599` | main | sandbox | Not Applicable | R7 |
| 312 | High | Input Validation | `artifacts/ai-tracker/src/pages/gpu-waste.tsx:111` | main | unreachable | Not Applicable | R2 |
| 52 | High | Do S | `artifacts/api-server/src/routes/budgets.ts:33` | main | unreachable | Not Applicable | R2 |
| 25 | High | Do S | `artifacts/api-server/src/routes/reports.ts:120` | main | unreachable | Not Applicable | R2 |
| 97 | High | Do S | `artifacts/api-server/src/routes/reports.ts:164` | main | unreachable | Not Applicable | R2 |
| 22 | High | Do S | `artifacts/api-server/src/routes/sync-mobile.ts:80` | main | unreachable | Not Applicable | R2 |
| 68 | High | Do S | `artifacts/api-server/src/routes/sync-mobile.ts:86` | main | unreachable | Not Applicable | R2 |
| 92 | High | Do S | `artifacts/api-server/src/routes/sync-mobile.ts:91` | main | unreachable | Not Applicable | R2 |
| 54 | High | Unexpected Behaviour | `artifacts/api-server/src/services/usage-engine.ts:5` | main | unreachable | Not Applicable | R2 |
| 184 | High | Insecure Modules Libraries | `artifacts/mobile-app/scripts/reset-project.js:55` | main | script | Not Applicable | R19 |
| 148 | High | File Access | `artifacts/mobile-app/scripts/reset-project.js:61` | main | script | Not Applicable | R19 |
| 161 | High | File Access | `artifacts/mobile-app/scripts/reset-project.js:64` | main | script | Not Applicable | R19 |
| 123 | High | Insecure Modules Libraries | `artifacts/mobile-app/scripts/reset-project.js:65` | main | script | Not Applicable | R19 |
| 152 | High | Insecure Modules Libraries | `artifacts/mobile-app/scripts/reset-project.js:68` | main | script | Not Applicable | R19 |
| 191 | High | Insecure Modules Libraries | `artifacts/mobile-app/scripts/reset-project.js:71` | main | script | Not Applicable | R19 |
| 172 | High | Insecure Modules Libraries | `artifacts/mobile-app/scripts/reset-project.js:92` | main | script | Not Applicable | R19 |
| 58 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:173` | main | migration | Not Applicable | R1 |
| 305 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:174` | main | migration | Not Applicable | R1 |
| 28 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:175` | main | migration | Not Applicable | R1 |
| 79 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:176` | main | migration | Not Applicable | R1 |
| 50 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:177` | main | migration | Not Applicable | R1 |
| 242 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:178` | main | migration | Not Applicable | R1 |
| 281 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:179` | main | migration | Not Applicable | R1 |
| 88 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:180` | main | migration | Not Applicable | R1 |
| 89 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:181` | main | migration | Not Applicable | R1 |
| 37 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:182` | main | migration | Not Applicable | R1 |
| 313 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:183` | main | migration | Not Applicable | R1 |
| 326 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:184` | main | migration | Not Applicable | R1 |
| 301 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:185` | main | migration | Not Applicable | R1 |
| 3 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:186` | main | migration | Not Applicable | R1 |
| 222 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:187` | main | migration | Not Applicable | R1 |
| 283 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:188` | main | migration | Not Applicable | R1 |
| 82 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:189` | main | migration | Not Applicable | R1 |
| 41 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:190` | main | migration | Not Applicable | R1 |
| 74 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:191` | main | migration | Not Applicable | R1 |
| 308 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:192` | main | migration | Not Applicable | R1 |
| 234 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:193` | main | migration | Not Applicable | R1 |
| 289 | High | SQL Injection | `lib/db/migrations/0000_shocking_changeling.sql:194` | main | migration | Not Applicable | R1 |
| 76 | High | SQL Injection | `lib/db/migrations/0001_eager_makkari.sql:29` | main | migration | Not Applicable | R1 |
| 268 | High | SQL Injection | `lib/db/migrations/0001_eager_makkari.sql:30` | main | migration | Not Applicable | R1 |
| 318 | High | SQL Injection | `lib/db/migrations/0001_eager_makkari.sql:31` | main | migration | Not Applicable | R1 |
| 24 | High | SQL Injection | `lib/db/migrations/0001_eager_makkari.sql:36` | PR8 | migration | Not Applicable | R1 |
| 99 | High | SQL Injection | `lib/db/migrations/0001_eager_makkari.sql:37` | PR8 | migration | Not Applicable | R1 |
| 288 | Medium | Code complexity | `artifacts/ai-tracker/src/components/dashboard/KpiCard.tsx:58` | main | unreachable | Not Applicable | R2 |
| 294 | Medium | Code complexity | `artifacts/ai-tracker/src/components/dashboard/SpendBreakdownChart.tsx:17` | main | unreachable | Not Applicable | R2 |
| 285 | Medium | Code complexity | `artifacts/ai-tracker/src/components/onboarding-wizard.tsx:76` | main | unreachable | Not Applicable | R2 |
| 238 | Medium | Code complexity | `artifacts/ai-tracker/src/components/onboarding/OnboardingWizard.tsx:16` | main | unreachable | Not Applicable | R2 |
| 194 | Medium | Code complexity | `artifacts/ai-tracker/src/components/ui/alert-dialog.tsx:60` | main | unreachable | Not Applicable | R2 |
| 275 | Medium | Code complexity | `artifacts/ai-tracker/src/components/ui/form.tsx:40` | main | unreachable | Not Applicable | R2 |
| 220 | Medium | Code complexity | `artifacts/ai-tracker/src/components/ui/sidebar.tsx:1` | main | unreachable | Not Applicable | R2 |
| 205 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/advanced-settings.tsx:16` | main | unreachable | Not Applicable | R2 |
| 260 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/analytics.tsx:29` | main | unreachable | Not Applicable | R2 |
| 282 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/anomalies.tsx:57` | main | unreachable | Not Applicable | R2 |
| 221 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/approvals.tsx:36` | main | unreachable | Not Applicable | R2 |
| 110 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/approvals.tsx:98` | main | unreachable | Not Applicable | R2 |
| 266 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/audit.tsx:36` | main | unreachable | Not Applicable | R2 |
| 235 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/auto-pilot.tsx:1` | main | unreachable | Not Applicable | R2 |
| 101 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/auto-pilot.tsx:313` | main | unreachable | Not Applicable | R2 |
| 263 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/auto-pilot.tsx:479` | main | unreachable | Not Applicable | R2 |
| 231 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/aws-bedrock.tsx:19` | main | unreachable | Not Applicable | R2 |
| 214 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/azure-ai.tsx:20` | main | unreachable | Not Applicable | R2 |
| 298 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/benchmarking.tsx:15` | main | unreachable | Not Applicable | R2 |
| 111 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/benchmarks-intelligence.tsx:17` | main | unreachable | Not Applicable | R2 |
| 163 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/budgets.tsx:395` | main | unreachable | Not Applicable | R2 |
| 254 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/calendar.tsx:31` | main | unreachable | Not Applicable | R2 |
| 162 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/cicd-integration.tsx:20` | main | unreachable | Not Applicable | R2 |
| 267 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/compliance.tsx:16` | main | unreachable | Not Applicable | R2 |
| 211 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/credits.tsx:61` | main | unreachable | Not Applicable | R2 |
| 269 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/digest.tsx:15` | main | unreachable | Not Applicable | R2 |
| 102 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/entities.tsx:15` | main | unreachable | Not Applicable | R2 |
| 255 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/founder-dashboard.tsx:34` | main | unreachable | Not Applicable | R2 |
| 108 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/gcp-vertex.tsx:20` | main | unreachable | Not Applicable | R2 |
| 128 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/gpu-calculator.tsx:18` | main | unreachable | Not Applicable | R2 |
| 178 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/gpu-waste.tsx:31` | main | unreachable | Not Applicable | R2 |
| 256 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/heatmap.tsx:16` | main | unreachable | Not Applicable | R2 |
| 225 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/import.tsx:24` | main | unreachable | Not Applicable | R2 |
| 106 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/integrations.tsx:1` | main | unreachable | Not Applicable | R2 |
| 258 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/integrations.tsx:311` | main | unreachable | Not Applicable | R2 |
| 240 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/intelligence.tsx:19` | main | unreachable | Not Applicable | R2 |
| 159 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/llm-router.tsx:20` | main | unreachable | Not Applicable | R2 |
| 224 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/not-found.tsx:9` | main | unreachable | Not Applicable | R2 |
| 249 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/privacy.tsx:15` | main | unreachable | Not Applicable | R2 |
| 158 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/report-builder.tsx:17` | main | unreachable | Not Applicable | R2 |
| 237 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/reports.tsx:1` | main | unreachable | Not Applicable | R2 |
| 293 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/reports.tsx:206` | main | unreachable | Not Applicable | R2 |
| 244 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/search-hub.tsx:42` | main | unreachable | Not Applicable | R2 |
| 219 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/settings.tsx:1` | main | unreachable | Not Applicable | R2 |
| 216 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/settings.tsx:317` | main | unreachable | Not Applicable | R2 |
| 144 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/settings.tsx:469` | main | unreachable | Not Applicable | R2 |
| 232 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/status.tsx:30` | main | unreachable | Not Applicable | R2 |
| 196 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/tax-optimization.tsx:15` | main | unreachable | Not Applicable | R2 |
| 245 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/unit-economics.tsx:32` | main | unreachable | Not Applicable | R2 |
| 113 | Medium | Code complexity | `artifacts/ai-tracker/src/pages/vendor-contracts.tsx:26` | main | unreachable | Not Applicable | R2 |
| 6 | Medium | Code complexity | `artifacts/api-server/build.mjs:13` | main | unreachable | Not Applicable | R2 |
| 139 | Medium | Code complexity | `artifacts/api-server/src/lib/cron-service.ts:33` | main | unreachable | Not Applicable | R2 |
| 229 | Medium | Code complexity | `artifacts/api-server/src/lib/sync-engine.ts:1` | main | unreachable | Not Applicable | R2 |
| 252 | Medium | Code complexity | `artifacts/api-server/src/lib/sync-engine.ts:62` | main | unreachable | Not Applicable | R2 |
| 213 | Medium | Code complexity | `artifacts/api-server/src/lib/sync-engine.ts:257` | main | unreachable | Not Applicable | R2 |
| 280 | Medium | Code complexity | `artifacts/api-server/src/lib/verify_sync.ts:6` | main | unreachable | Not Applicable | R2 |
| 175 | Medium | Code complexity | `artifacts/api-server/src/routes/cicd.ts:12` | main | unreachable | Not Applicable | R2 |
| 276 | Medium | Code complexity | `artifacts/api-server/src/routes/dashboard-calendar.ts:15` | main | unreachable | Not Applicable | R2 |
| 287 | Medium | Code complexity | `artifacts/api-server/src/routes/dashboard-summary.ts:17` | main | unreachable | Not Applicable | R2 |
| 292 | Medium | Code complexity | `artifacts/api-server/src/routes/dashboard-summary.ts:121` | main | unreachable | Not Applicable | R2 |
| 296 | Medium | Code complexity | `artifacts/api-server/src/routes/receipts.ts:15` | main | unreachable | Not Applicable | R2 |
| 239 | Medium | Code complexity | `artifacts/api-server/src/routes/reports.ts:56` | main | unreachable | Not Applicable | R2 |
| 171 | Medium | Code complexity | `artifacts/api-server/src/routes/sync-mobile.ts:30` | main | unreachable | Not Applicable | R2 |
| 273 | Medium | Code complexity | `artifacts/api-server/src/routes/sync-mobile.ts:147` | main | unreachable | Not Applicable | R2 |
| 212 | Medium | Code complexity | `artifacts/api-server/src/routes/telemetry.ts:62` | main | unreachable | Not Applicable | R2 |
| 209 | Medium | Code complexity | `artifacts/api-server/src/routes/telemetry.ts:147` | main | unreachable | Not Applicable | R2 |
| 257 | Medium | Code complexity | `artifacts/api-server/src/routes/telemetry.ts:279` | main | unreachable | Not Applicable | R2 |
| 166 | Medium | Code complexity | `artifacts/api-server/src/routes/telemetry.ts:386` | main | unreachable | Not Applicable | R2 |
| 169 | Medium | Best practice | `artifacts/mobile-app/eslint.config.js:2` | main | unreachable | Not Applicable | R22 |
| 147 | Medium | Best practice | `artifacts/mobile-app/eslint.config.js:3` | main | unreachable | Not Applicable | R22 |
| 182 | Medium | Best practice | `artifacts/mobile-app/scripts/reset-project.js:9` | main | script | Not Applicable | R19 |
| 107 | Medium | Best practice | `artifacts/mobile-app/scripts/reset-project.js:10` | main | script | Not Applicable | R19 |
| 160 | Medium | Best practice | `artifacts/mobile-app/scripts/reset-project.js:11` | main | script | Not Applicable | R19 |
| 227 | Medium | Code complexity | `artifacts/mobile-app/src/app/explore.tsx:14` | main | unreachable | Not Applicable | R2 |
| 233 | Medium | Code complexity | `artifacts/mobile-app/src/app/index_original.tsx:1` | main | unreachable | Not Applicable | R2 |
| 122 | Medium | Code complexity | `artifacts/mobile-app/src/app/index_original.tsx:16` | main | unreachable | Not Applicable | R2 |
| 135 | Medium | Code complexity | `artifacts/mobile-app/src/app/index_premium.tsx:1` | main | unreachable | Not Applicable | R2 |
| 199 | Medium | Code complexity | `artifacts/mobile-app/src/app/index_premium.tsx:20` | main | unreachable | Not Applicable | R2 |
| 274 | Medium | Code complexity | `artifacts/mobile-app/src/app/notifications.tsx:69` | main | unreachable | Not Applicable | R2 |
| 291 | Medium | Code complexity | `artifacts/mobile-app/src/app/subscriptions.tsx:73` | main | unreachable | Not Applicable | R2 |
| 295 | Medium | Code complexity | `artifacts/mockup-sandbox/src/components/ui/alert-dialog.tsx:60` | main | sandbox | Not Applicable | R7 |
| 247 | Medium | Code complexity | `artifacts/mockup-sandbox/src/components/ui/form.tsx:40` | main | sandbox | Not Applicable | R7 |
| 201 | Medium | Code complexity | `artifacts/mockup-sandbox/src/components/ui/sidebar.tsx:1` | main | sandbox | Not Applicable | R7 |
| 218 | Medium | Code complexity | `lib/api-zod/src/generated/api.ts:1` | main | generated | Not Applicable | R25 |
| 116 | Medium | Compatibility | `lib/db/migrations/0000_shocking_changeling.sql:1` | main | migration | Not Applicable | R1 |
| 126 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:1` | main | migration | Not Applicable | R1 |
| 129 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:1` | main | migration | Not Applicable | R1 |
| 155 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:1` | main | migration | Not Applicable | R1 |
| 173 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:1` | main | migration | Not Applicable | R1 |
| 104 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:15` | main | migration | Not Applicable | R1 |
| 200 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:15` | main | migration | Not Applicable | R1 |
| 189 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:26` | main | migration | Not Applicable | R1 |
| 197 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:26` | main | migration | Not Applicable | R1 |
| 121 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:41` | main | migration | Not Applicable | R1 |
| 124 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:41` | main | migration | Not Applicable | R1 |
| 156 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:59` | main | migration | Not Applicable | R1 |
| 164 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:59` | main | migration | Not Applicable | R1 |
| 168 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:73` | main | migration | Not Applicable | R1 |
| 174 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:73` | main | migration | Not Applicable | R1 |
| 125 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:87` | main | migration | Not Applicable | R1 |
| 133 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:87` | main | migration | Not Applicable | R1 |
| 151 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:97` | main | migration | Not Applicable | R1 |
| 195 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:97` | main | migration | Not Applicable | R1 |
| 8 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:106` | main | migration | Not Applicable | R1 |
| 132 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:106` | main | migration | Not Applicable | R1 |
| 30 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:117` | main | migration | Not Applicable | R1 |
| 130 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:117` | main | migration | Not Applicable | R1 |
| 188 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:129` | main | migration | Not Applicable | R1 |
| 193 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:129` | main | migration | Not Applicable | R1 |
| 118 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:141` | main | migration | Not Applicable | R1 |
| 190 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:141` | main | migration | Not Applicable | R1 |
| 105 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:153` | main | migration | Not Applicable | R1 |
| 170 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:153` | main | migration | Not Applicable | R1 |
| 1 | Medium | Performance | `lib/db/migrations/0000_shocking_changeling.sql:161` | main | migration | Not Applicable | R1 |
| 117 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:161` | main | migration | Not Applicable | R1 |
| 176 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:173` | main | migration | Not Applicable | R1 |
| 143 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:174` | main | migration | Not Applicable | R1 |
| 140 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:175` | main | migration | Not Applicable | R1 |
| 187 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:176` | main | migration | Not Applicable | R1 |
| 112 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:177` | main | migration | Not Applicable | R1 |
| 137 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:178` | main | migration | Not Applicable | R1 |
| 109 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:179` | main | migration | Not Applicable | R1 |
| 149 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:180` | main | migration | Not Applicable | R1 |
| 141 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:181` | main | migration | Not Applicable | R1 |
| 21 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:182` | main | migration | Not Applicable | R1 |
| 120 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:183` | main | migration | Not Applicable | R1 |
| 154 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:184` | main | migration | Not Applicable | R1 |
| 192 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:185` | main | migration | Not Applicable | R1 |
| 198 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:186` | main | migration | Not Applicable | R1 |
| 181 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:187` | main | migration | Not Applicable | R1 |
| 165 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:188` | main | migration | Not Applicable | R1 |
| 65 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:189` | main | migration | Not Applicable | R1 |
| 16 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:190` | main | migration | Not Applicable | R1 |
| 36 | Medium | Best practice | `lib/db/migrations/0000_shocking_changeling.sql:191` | main | migration | Not Applicable | R1 |
| 150 | Medium | Code complexity | `lib/db/src/sync-mobile.test.ts:140` | main | test | Not Applicable | R23 |
| 278 | Medium | Code complexity | `lib/db/src/sync-mobile.test.ts:303` | main | test | Not Applicable | R23 |
| 33 | Medium | Code complexity | `pnpm-lock.yaml:1` | main | unreachable | Not Applicable | R11 |
