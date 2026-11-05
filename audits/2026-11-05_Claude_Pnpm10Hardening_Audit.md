# pnpm 10 supply-chain hardening — 2026-11-05

- **Agent:** Claude
- **Branch:** `agent/claude/pnpm10-hardening`, based on `docs/fix-doc-drift` at `e1a6f52`. Separate PR approved by Shayan. No other dependency was upgraded.
- **Scope:** move from pnpm 9.15.9 to pnpm 10 so the settings in `pnpm-workspace.yaml` take effect, especially `minimumReleaseAge`. No merge, deploy, infrastructure change, paid call or file deletion took place.

## Version choice

`npm view pnpm time --json`, checked 2026-11-05 04:39 UTC:

| Version | Published | Age | Decision |
|---|---|---|---|
| 10.34.9 (`latest-10`) | 2026-10-25 | 11 days | Too new (under ~2 weeks) |
| 10.34.8 | 2026-10-23 | 13 days | Too new |
| **10.34.7** | **2026-10-12T06:05Z** | **24 days** | **Chosen**: newest 10.x older than two weeks |
| 10.16.0 | 2025-09-12 | — | First release with `minimumReleaseAge` |

pnpm 11 and 12 exist, but they are new majors and outside this PR's scope. The pnpm 10.34.7 bundle supports `allowBuilds` and `strictDepBuilds` (checked in its `dist/pnpm.cjs`).

## Files changed

- `package.json`: `packageManager` is `pnpm@10.34.7`. The `pnpm.overrides` block is removed. All 38 entries already existed in `pnpm-workspace.yaml`, and a script comparison found them identical. The workspace file is now the only source.
- `pnpm-workspace.yaml`: the enforcement note is updated. `onlyBuiltDependencies` is replaced by `strictDepBuilds: true` plus an explicit `allowBuilds` map. No override was loosened or dropped.
- `.github/workflows/{ci,ci-api-server,deploy,gate,launch-rehearsal,launch-verify}.yml`: `pnpm/action-setup` `version: 10.34.7`, which matches `packageManager`.
- `Dockerfile.verify` and `artifacts/api-server/Dockerfile` (both stages): `npm install -g pnpm@10.34.7`.
- `README.md` and `docs/governance/LAUNCH_HANDOFF.md`: the pinned version is updated, with a note not to use the cached pnpm 9 CLI.
- `docs/governance/DEFERRED_WORK.md`: the supply-chain item is marked fixed on this branch.

No other pnpm version string remains outside historical audits: a grep for `9.15.9` and `pnpm@` found none.

## Lifecycle scripts

pnpm 10 blocks dependency build scripts by default. Every package installed on Linux whose manifest has `preinstall`, `install` or `postinstall` (or an implicit `binding.gyp`) was listed from a clean install. There are exactly four:

| Package | Script | Decision | Reason |
|---|---|---|---|
| `esbuild@0.28.1` | `node install.js` | **allow** | Checks that the platform binary matches the pinned esbuild version and fetches it with an integrity check if the optional package is missing. Used by the api-server build, tsx and drizzle-kit. |
| `core-js@3.47.0`, `@3.49.0` | `postinstall` | deny | Only prints a donation banner. |
| `browser-tabs-lock@1.3.0` | `scripts/postinstall.js` | deny | Only prints a "thank you" banner. |
| `unrs-resolver@1.12.2` | `napi-postinstall` | deny | Only re-downloads the native binding when the optional platform package is missing; pnpm installs that package. Used only by the mobile eslint import resolver, and mobile eslint passes. |

The former `onlyBuiltDependencies` entries are dropped. `@clerk/shared@4.44.0` has no install script. `@swc/core`, `msgpackr-extract` and `msw` are not in the lockfile. `strictDepBuilds: true` makes any new unreviewed script fail the install. Negative test: with `core-js` removed from `allowBuilds`, `install --frozen-lockfile --force` failed with `ERR_PNPM_IGNORED_BUILDS  Ignored build scripts: core-js@3.47.0, core-js@3.49.0`.

## Lockfile impact

None. `pnpm-lock.yaml` is unchanged, as `git diff --exit-code pnpm-lock.yaml` shows. A clean frozen install in a scratch copy installed 1325 packages, reported `Lockfile is up to date, resolution step is skipped`, and finished with `ignoredBuilds: []`.

pnpm 10 reads the overrides from `pnpm-workspace.yaml`. Removing a single override (`qs`) from the workspace file made the frozen install fail with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH ... The current "overrides" configuration doesn't match the value found in the lockfile`. Forced versions resolve as expected: `glob@14.0.2`, `minimatch@11.0.1` (plus the out-of-range `3.1.5`), `@babel/core@7.29.13`, `esbuild@0.28.1`, `qs@6.16.1`, `body-parser@2.4.0`, `postcss@8.5.23` and `js-yaml@4.3.2`.

## `minimumReleaseAge` enforcement proof

The test ran in a throwaway directory outside the repo (`scratchpad/mra-proof/`): a `package.json` with `packageManager: pnpm@10.34.7`, and a `pnpm-workspace.yaml` containing only `minimumReleaseAge: 1440`.

```text
$ corepack pnpm@10.34.7 add typescript@7.1.0-dev.20261104.1   # published 2026-11-04T08:26Z, 20 h old
 ERR_PNPM_NO_MATURE_MATCHING_VERSION  Version 7.1.0-dev.20261104.1 (released 20 hours ago) of typescript does not meet the minimumReleaseAge constraint
exit=1, no node_modules created

$ corepack pnpm@10.34.7 add typescript@7.1.0-dev.20261102.1   # published 2026-11-02T08:16Z, 68 h old
+ typescript 7.1.0-dev.20261102.1
Done in 1.7s using pnpm v10.34.7

# Control, the old pin: same config under pnpm 9
$ corepack pnpm@9.15.9 add -w typescript@7.1.0-dev.20261104.1
+ typescript 7.1.0-dev.20261104.1   # pnpm 9 ignores the setting
```

## Verification (pnpm 10.34.7, Node 22.23.4, Linux)

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` (worktree and clean copy) | pass, lockfile unchanged |
| `pnpm --filter @workspace/api-spec run codegen` + `git diff --exit-code` generated dirs | pass, no drift (orval's `lib/api-zod/src/index.ts` line restored, not committed) |
| `pnpm run typecheck` | pass |
| `pnpm test` | pass: api-server 17 files / 173 tests, ai-tracker 8 files / 59 tests |
| `pnpm --filter @workspace/db test` | pass: 5 files / 28 tests |
| `pnpm run build` | pass (the existing `"use client"` sourcemap warnings are unchanged) |
| `pnpm --filter mobile-app run typecheck` | pass |
| `pnpm --filter mobile-app exec eslint …` (launch-verify step) | pass |
| `expo export --platform android` (`EXPO_OFFLINE=1`, output outside the repo, no Clerk key) | pass, 5.7 MB Hermes bundle |
| `pnpm audit --audit-level=moderate` | pass: no known vulnerabilities |
| gitleaks over `origin/docs/fix-doc-drift..HEAD` | see the PR. `scripts/verify.sh` runs a full-history `gitleaks detect`, which still reports only the known `9594a50` placeholder false positives (`.env.example`/`.env.template` line 13), an existing OPEN item in `DEFERRED_WORK.md` |

## Not verified locally

- The Docker builds (`Dockerfile.verify`, `artifacts/api-server/Dockerfile` on node:22-alpine) did not run, because there is no Docker daemon in the agent container. `launch-rehearsal.yml` builds the API image and runs the container smoke test on push.
- The Android export ran without the real Clerk publishable key. CI (`launch-verify.yml`) runs it with the repository variable.
- No macOS or Windows install was tested. `strictDepBuilds` will fail loudly there if those platforms install another package with a script, and that package then needs an explicit `allowBuilds` decision.
- Exact-SHA CI results are on the PR. Developers must use pnpm 10.34.7 (`corepack enable`): pnpm 9 silently ignores these settings.
