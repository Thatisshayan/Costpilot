# Codacy remediation — 2026-11-05

- **Agent:** Claude
- **Branch:** `agent/claude/security-remediation`, from `main` at `611b966`.
- **Input:** the owner's Codacy export, 345 findings.
- **Register:** [`docs/security/CODACY_REMEDIATION_REGISTER.md`](../docs/security/CODACY_REMEDIATION_REGISTER.md) (single source of truth).

## Fixed in this PR

| Finding | Change | Evidence |
|---|---|---|
| **Critical:** `kms-vault.ts` GCM decipher without tag length (3 findings) | `gcmDecipher` requires a 12-byte IV and a full 16-byte tag (`authTagLength: 16`). Authentication errors in well-formed envelopes are no longer masked as "invalid format". | `lib/db/src/kms.test.ts`: 4 new tests. Run against the old code, 3 fail (truncated 4-byte tags were accepted); all pass on the new code. |
| **Critical/High:** `webhooks.ts` timing-unsafe secret comparison (2) | `secretsMatch` compares SHA-256 digests with `crypto.timingSafeEqual`. | `webhooks.test.ts`: 8 cases. |
| **High:** `pnpm/action-setup@v4` third-party action not pinned (6 workflows, 9 uses) | Pinned to commit `b906affcce14559ad1aafd4ab0e942779e9f58b1`, the commit the `v4` tag points to today (v4.3.0), so behaviour is unchanged. | CI on this PR |
| **High:** API Dockerfile without `USER` | The runtime stage runs as `node`. | CI container smoke test (Docker is not available locally) |
| **High:** docker-compose setuid escalation (2) | `no-new-privileges:true` on postgres and redis (local development only) | — |
| **Critical (evidence):** CSV export "XSS" | No code change needed. | The rehearsal now asserts `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment`. |

**Fixed in the Batch 2 PR:** the export-loop DoS (PR #8's historical finding) via a 50,000-row cap (413), with a 50,001-row rehearsal case.

## Reconciliation

- **The 5 historical unresolved findings** are now identified (PR #8: 3; PR #9: 2) and dispositioned. See the register.
- **PR #14's 25 new findings are not in the export,** because every exported finding is code already on `main`. They remain pending until the PR-specific list is available.

## Verification (security worktree)

- `pnpm run typecheck` (all packages)
- API tests: 17 files, 174 tests
- `lib/db` tests: 5 files, 32 tests
- PostgreSQL 16 rehearsal: passed

## Not changed (and why)

- **No Codacy rule was suppressed.**
- **Historical migrations were not rewritten.**
- **No dependency upgrades.**
- **Unreachable legacy code is not edited in place;** it is listed for deletion with approval.
