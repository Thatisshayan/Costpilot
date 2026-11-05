# Main baseline — 2026-11-05

- **Agent:** Claude
- **Scope:** owner-approved merge sequence into `main`, post-merge safety checks, new engineering baseline. No deployment, migration, provisioning or paid call was made.

## Merge sequence (all owner-approved, each pinned to the verified head SHA)

| PR | Into | Head verified | Merge commit |
|---|---|---|---|
| #8 PR #7 review blockers | `docs/fix-doc-drift` | `83ae902` | `e1a6f52` |
| #10 CodeRabbit follow-ups | `docs/fix-doc-drift` | `25ce0fb` | `0490439` |
| #9 fail-closed gitleaks coverage + exact-fingerprint exceptions | `docs/fix-doc-drift` | `deea311` | `b58ba0e` |
| #11 pnpm 10.34.7 (minimumReleaseAge enforced) | `docs/fix-doc-drift` | `acb31d8` | `704b658` |
| #7 core release | `main` | `704b658` | **`19c4e04`** |

## Evidence on the exact final head `704b658`

- **CI: all 10 jobs passed.**
  - typecheck, test, build, security-audit (pnpm audit);
  - both governance gates;
  - build-and-test;
  - PostgreSQL rehearsal: repeated migrations, migration guard, backup/restore, production container smoke, and the invite-escalation, refund-export, export-scope and personal-scope assertions;
  - contracts + Android export.
- **Other checks:** Codacy and CodeFactor passed on PR #7.
- **Secret scan:** the gate verified the gitleaks checksum and scanned all 51 commits from `main` to the PR head, plus the tracked files at HEAD, with no leaks. This was observed at `b58ba0e`; the gate passed again at `704b658`.
- **minimumReleaseAge:** independently re-verified. pnpm 10.34.7 refuses `typescript@7.1.0-dev.20261104.1`, released 20 hours earlier, with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`, and installs a 68-hour-old version.
- **Tree identity:** `main`'s tree after the merge equals the verified tree `704b658` (`43ae0a0`).

## Post-merge safety (observed, not assumed)

- **Workflows on the push to `main`:** only `CI` and `CI - API Server` ran. Both passed on `19c4e04`; `CI` on `main` had been failing before this merge.
  - Neither job deploys, migrates or uses secrets; their Postgres is a disposable service container.
  - `deploy.yml` (Pages) is `workflow_dispatch`-only and did **not** run. The previous push to `main` (`cf34541`) did trigger it.
- **No other publishing paths:**
  - no GitHub Pages branch-build workflow exists;
  - no Vercel project is linked to the repository (checked read-only);
  - no Railway service is provisioned, per the handoff (outside the repository, not inspectable here).

## Review coverage gaps (recorded, not hidden)

- **Codacy:** 3 (PR #8) and 2 (PR #9) high-severity security findings remain **unidentified and unresolved**. The owner accepted them for this code merge only; they must be dispositioned before external customer access.
- **CodeRabbit:** it never reviewed PRs #9, #10 and #11, because they did not target `main`. For PR #7 it hit its free-plan limits: rate limit, then 103 files against a 100-file maximum. The agent reviewed and tested those changes, but no second automated reviewer did.
- **CodeRabbit note on migration 0001:** the unique index is built without `CONCURRENTLY`. That is acceptable inside a migration transaction on an empty database; revisit it before migrating any populated database.

## Not verified (unchanged)

The following have not been done: live Clerk sign-in, a physical device, deployed CORS/webhooks/monitoring, a real backup restore, approved hosting, operator identity and legal pages. The product is **not** launch-ready.
