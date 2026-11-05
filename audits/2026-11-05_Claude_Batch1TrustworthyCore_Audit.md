# Batch 1 — Trustworthy core — 2026-11-05

- **Agent:** Claude
- **Branch:** `agent/claude/batch1-trustworthy-core`, from `main` at `611b966`.
- **Scope:** backlog Batch 1, owner-approved 2026-11-05: P0-01, P0-02 (UI part), P0-04, P0-05, P0-08, P0-10, P0-14, P0-15, P0-17 (guard).
- **Not done:** no database migration, deployment, paid service, provider call or file deletion.

## What changed

| Area | Change | Main files |
|---|---|---|
| Workspace scope | Selection saved per signed-in account and restored on reload. When the list loads, a deleted or revoked workspace falls back to Personal with a notice. Create and accept-invite now switch into the workspace and refresh the list. The switcher shows loading and error states with retry, and each workspace's role. | `ai-tracker/src/context/workspace-context.tsx`, `components/workspace-switcher.tsx`, `components/create-workspace-form.tsx`, `pages/accept-invite.tsx` |
| Workspace identity | **API:** display names need not be unique. The server generates the slug (`<name>-<8 hex>`), ignores client slugs and retries on collision. Names are trimmed, 1–80 characters. A slug clash on rename returns 409, not 500. The list and create responses include the caller's `role`. | `api-server/src/routes/workspaces.ts` |
| Permissions | Pages read the caller's role from the workspace list. Owners and admins see write controls; viewers see none, plus a read-only note. The server still enforces every rule unchanged. The team page hides invite, rename, remove and delete from roles that cannot use them. | `pages/expenses.tsx`, `platforms.tsx`, `projects.tsx`, `collaboration.tsx`, `dashboard.tsx` |
| Forms | Every input has a linked label. Inline errors use `aria-invalid` and `aria-describedby`. Client checks mirror the server's money, date and currency rules, and the server's own message is always shown. Currency is now an ISO 4217 picker. Categories now cover cloud, AI and SaaS. A failed save keeps the dialog open with "Not saved: …", so nothing appears saved when it was not. | `lib/expense-form.ts`, `lib/api-error.ts`, the pages above |
| Vendors | Load failure shows an error with retry, not "no vendors". "Vendor" naming is used throughout. Website links render only for http(s) URLs, so a stored `javascript:` link can't run. | `pages/platforms.tsx` |
| Team | Personal scope explains workspaces and offers "Create workspace". Invitation links appear in a labelled panel with a copy button per link and a sharing warning. Remove, leave and delete ask for confirmation. Role descriptions match what the server allows. | `pages/collaboration.tsx` |
| Navigation and honesty | The sidebar defines only the 5 live screens (it previously defined 47). Removed: the dead search box and mobile search button, the ⌘ hints, the "All Systems Operational" badge (replaced by a warning shown only when the API is unreachable) and the non-functional light-mode switch (D7). Also: `aria-current`, mobile menu `aria-expanded`, reduced-motion support, pinch-zoom re-enabled, and page metadata and manifest no longer claim forecasting or AI control. | `components/layout.tsx`, `App.tsx`, `index.html`, `public/manifest.json` |
| Phone width | Headers wrap, forms stack, tables scroll inside their card, dialogs scroll. | the pages above |
| API contract | 6 live endpoints were missing from OpenAPI: import-batch, leave, remove member, accept invite, invite preview, delete workspace. They are now documented, and the generated hooks replace the hand-written ones (`workspace-hooks.ts` is no longer exported; deletion awaits approval). The 39 spec operations blocked by the launch scope are marked `x-costpilot-availability: disabled`. A CI test compares mounted, live routes with the spec in both directions. | `lib/api-spec/openapi.yaml`, generated clients, `api-server/src/__tests__/openapi-contract.test.ts` |
| Mock-data guard | `scripts/mock-guard.mjs` walks the import graph from the web, API and mobile entry points and fails if any reachable file is a known simulator or contains fabrication markers. It also fails closed on unresolved imports. It runs in the CI gate with 14 tests, including deliberate violations. **It found a real gap:** `routes/platforms.ts` still imported the simulated `sync.ts → sync-engine.ts`, blocked only at runtime. That mount is removed; live behaviour is unchanged (it already returned 503). | `scripts/mock-guard.mjs`, `scripts/__tests__/mock-guard.test.mjs`, `scripts/verify.mjs`, `REPO_RULES.md` 1.0.3 |

## Batch 1 acceptance tests (backlog)

| # | Test | Result | Evidence |
|---|---|---|---|
| 1 | Saved workspace survives reload; revoked/deleted falls back to Personal with notice | Pass | `workspace-context.test.tsx` (6 tests); real browser: the narrow-viewport harness restores workspace scope from storage |
| 2 | Two users both create "Acme"; creator switched in; list refreshes | Pass | PostgreSQL rehearsal (distinct slugs, client slug ignored, 400 for blank/81-char names, 409 slug clash, lists account-scoped, cross-account 403); `create-workspace-form.test.tsx` (3) |
| 3 | After accept, joined workspace is active | Pass | `accept-invite.test.tsx` (2, including failure path) |
| 4 | Viewer: no write controls; a forced 403 shows the server message | Pass | `trustworthy-core.test.tsx`; rehearsal: viewer PATCH = 403; `expense-form.test.ts` (403 message) |
| 5 | Labels, inline errors, `aria-invalid`, server 400 shown, ISO currency picker | Pass | `trustworthy-core.test.tsx` (3), `expense-form.test.ts` (11) |
| 6 | Row actions visible without hover, keyboard-reachable, labelled | Pass | `trustworthy-core.test.tsx` |
| 7 | Every sidebar item routed; no search, ⌘ hints or theme switch | Pass | `layout.test.tsx` (4) |
| 8 | Vendor load failure shows error and retry, not empty state | Pass | `trustworthy-core.test.tsx` |
| 9 | Personal-scope explanation and CTA; copyable invite panel | Pass | `trustworthy-core.test.tsx` (4 team tests) |
| 10 | 375px: no horizontal page scroll on any live route | Pass, **local only** | `e2e/narrow-viewport.mjs`: Chromium at 375px; 6 routes × owner/viewer × Personal/workspace = 24 combinations; screenshots inspected. Clerk is stubbed and the API is served from fixtures. Not in CI (needs a browser in CI). |
| 11 | Mounted live routes = contract; generated clients match spec | Pass | `openapi-contract.test.ts` (4, including a planted violation); codegen re-run gives no diff in the generated directories |
| 12 | Guard fails on a planted violation, passes on the batch | Pass | `mock-guard.test.mjs` (14); guard OK on 165 reachable files |
| 13 | All existing CI green | Pass locally; CI on PR | typecheck (all packages), build, API 177/177, web 97/97, rehearsal passed |

**Supplementary security and correctness checks:**
- Workspace isolation: rehearsal cases for list scoping, cross-account member access (403), and the existing personal/shared expense isolation.
- Unsafe vendor URLs are not rendered.
- The saved-scope key is per account, so one account's selection never applies to another; the workspace id is validated against the server list.

## Verification commands (local, 2026-11-05)

- `pnpm run typecheck` (all packages)
- `pnpm run build`
- `pnpm run test`: API 18 files / 177 tests; web 14 files / 97 tests
- `pnpm run mock-guard` and `pnpm run test:mock-guard`
- `pnpm --filter @workspace/db run migrate` (twice) and `pnpm --filter @workspace/db run rehearsal` on a disposable PostgreSQL 16
- `node artifacts/ai-tracker/e2e/narrow-viewport.mjs`
- Codegen drift: `pnpm --filter @workspace/api-spec run codegen`, then `git diff --exit-code` on the generated directories

## Codacy on PR #14

**Report:** 25 new issues: 1 critical and 19 high (Security), 5 medium (unused code, best practice, complexity).

**Why the list is a reproduction:** Codacy's per-issue list is not readable from the agent environment (app.codacy.com is blocked, and the check run carries no annotations). The findings were reproduced locally with `eslint-plugin-security` 3.0.1 and the open-source Semgrep rules on the changed files. This is a **probable match, not a confirmed one**.

| Finding (local reproduction) | Where | Assessment | Action |
|---|---|---|---|
| `detect-unsafe-regex` on amount parsing | `ai-tracker/src/lib/expense-form.ts` (runs on user input) | Patterns were linear, but they run on user input | **Fixed:** replaced with a split-and-digits check (no nested quantifiers) |
| `detect-object-injection` on badge lookups keyed by server strings | `pages/collaboration.tsx` | A crafted `__proto__` role could only break a badge | **Fixed:** `Map` lookups |
| `detect-object-injection` on typed keys | `pages/expenses.tsx` (`fieldErrors[field]`, `ENTRY_TYPE_LABEL[type]`) | Keys are compile-time unions; not user-controlled | Not changed |
| `detect-non-literal-fs-filename`, `detect-unsafe-regex`, `detect-object-injection` | `scripts/mock-guard.mjs`, `scripts/__tests__/*`, `api-server/src/__tests__/openapi-contract.test.ts`, `ai-tracker/src/components/layout.test.tsx`, `e2e/narrow-viewport.mjs` | Build-time and test tooling over repository files only, never request data | Not changed; recorded |
| Semgrep `spawn-shell-true` | `scripts/verify.mjs:12` | Pre-existing on `main` (shell only for Windows `.cmd` shims) | Not changed |

**Status:** these findings stay recorded as **unconfirmed until the owner or someone with Codacy access compares them with the actual list**. None is classified as a false positive on Codacy's side. The 5 historical Codacy findings remain unresolved.

## Limitations and follow-ups

- **Not exercised:** a live Clerk sign-in and a real two-account journey in a browser (Clerk is unreachable here). All UI journeys were verified with component tests and a stubbed-auth browser harness, not end to end.
- **Phone tables:** on phones, wide tables scroll inside their card, so the amount column needs a scroll. A stacked layout is planned for Batch 2.
- **Dashboard formatting:** totals still use `toFixed(2)` (JPY formatting); Batch 2, P0-06.
- **Contributor role:** not implemented; D2 requires an authorization matrix and its own batch.
- **Codacy:** the 5 historical findings remain **unresolved**.
- **Pending deletion approval:** `workspace-hooks.ts` and the files in the [legacy code inventory](../docs/product/LEGACY_CODE_INVENTORY.md).
