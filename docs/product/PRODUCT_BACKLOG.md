# CostPilot product backlog

**Status:** proposed 2026-11-05; awaiting owner approval of priorities.

This document is the **single source of truth for product priorities**. `LAUNCH_PLAN.md` and `DEFERRED_WORK.md` point here instead of keeping their own lists.

- **Evidence:** [product assessment](../../audits/2026-11-05_Claude_ProductAssessment_Audit.md) and [market research](MARKET_RESEARCH.md).
- **Not in scope:** infrastructure, hosting, paid services, live provider connections and public launch. Each needs separate owner approval (`docs/design/`).

**Conventions:**
- **Size:** S ≤ 1 day, M = 2–4 days, L = 5+ days.
- **Status codes**, from the assessment:

  | Code | Meaning |
  |---|---|
  | 1 | Works |
  | 2 | Incomplete |
  | 3 | UI only |
  | 4 | Backend only |
  | 5 | Disabled |
  | 6 | Missing |
  | 7 | Mock |
  | 8 | Provider-dependent |

**Rules for every item:**
- OpenAPI is the source of truth, with generated clients.
- Workspace isolation is covered by tests.
- Money in cents per currency, never converted.
- Docs are updated in the same PR.
- No mock fallbacks.
- Database changes are rehearsed on a disposable PostgreSQL 16 with the migration guard.

## 0. Product decisions (owner, 2026-11-05)

| # | Decision | Applies to |
|---|---|---|
| D1 | **Positioning:** a B2B platform for development teams, SaaS companies and businesses managing cloud, AI API and SaaS spend. It initially targets smaller teams (roughly $50k/month of tech spend or less). This is a market guideline, not a software limit. | All |
| D2 | **Contributor ("member") role approved.** Members create and manage permitted financial records but cannot administer membership or sensitive settings. Before implementation: a written owner/admin/member/viewer authorization matrix with tests. Delivered in its own later batch with migration and regression tests; workspace isolation must not weaken. | P0-02b |
| D3 | **Four-decimal support later, not a blanket change.** First propose a decimal model that separates unit prices, usage quantities, discounts, credits and posted charges. No schema change until that proposal is approved. | P0-16, P2 |
| D4 | **Keep source currencies; never convert or sum across currencies silently.** An optional reporting currency may come later, with explicit rates, timestamps and calculation rules. | P1-08 |
| D5 | **Mobile frozen** for feature work. Security, auth compatibility, bug fixes and builds are still maintained. The web app is the main B2B experience. | — |
| D6 | **Inventory first, no deletion or activation without approval.** Inventory: [LEGACY_CODE_INVENTORY.md](LEGACY_CODE_INVENTORY.md). Disabled code must stay unreachable (enforced by `scripts/mock-guard.mjs`). | P0-17 |
| D7 | **Hide the light-mode switch** until light mode is built and tested. | P0-05 (done in Batch 1) |
| D8 | **In-app budget alerts first;** email and Slack later. | P1-02 |
| D9 | **AWS is the preferred first integration to investigate, not approved for implementation.** CSV import and the core cost features come first. | P2 |
| D10 | **SaaS subscriptions and renewals in early P1,** after the dashboard, budgets and CSV import. No Stripe billing or payment processing. | P1-04 |

## P0: core product completeness

### P0-01 Workspace scope that persists and switches correctly
- **Status:** 2. Active workspace is `useState(null)`; no auto-select after create or join; slug must be globally unique.
- **Value:** high. Teams currently think their data vanished.
- **Dependencies:** none.
- **Code:** `ai-tracker/src/context/workspace-context.tsx:14`, `components/workspace-switcher.tsx:29-41`, `pages/accept-invite.tsx:108`, `api-server/src/routes/workspaces.ts` (create), `lib/db/src/schema/workspaces.ts:9`.
- **Acceptance:**
  - The selected scope survives reload (per user, in local storage, validated against membership; falls back to Personal if access was lost).
  - Create and accept-invite select the new workspace and refresh the list.
  - The server generates a unique slug when the name collides.
  - A readable error appears on conflicts.
- **Tests:**
  - web unit: context restore, fallback when membership is lost;
  - API: two workspaces named "Acme" by different users both succeed;
  - existing isolation tests stay green.
- **Size:** S. **Priority:** P0, Batch 1.

### P0-02 Role-aware UI (done in Batch 1) and contributor role (P0-02b, later batch, ⚑D2)
- **Status:** 2. Roles are owner/admin/viewer; write buttons show for viewers and fail with a generic error.
- **Value:** high for B2B teams (engineers record spend; finance views).
- **Dependencies:** D2 (contributor role needs an API contract and server change).
- **Code:** `api-server/src/routes/expenses.ts:27,162,243,282`, `routes/projects.ts:34`, `routes/platforms.ts:47`, `lib/resource-scope.ts:8`, `pages/expenses.tsx`, `pages/projects.tsx`, `pages/platforms.tsx`, `pages/collaboration.tsx:125-127`.
- **Acceptance:**
  - Write controls are hidden or disabled with a reason for roles that cannot write.
  - A 403 shows the server's message.
  - If D2 is approved, `member` can create/edit/delete expenses but cannot manage members or vendors.
  - Role defaults to "loading", not "viewer".
- **Tests:**
  - API matrix (role × action) for expenses, projects and vendors in two workspaces;
  - web tests that the viewer sees no write controls.
- **Size:** S (UI only) / M (with the new role). **Priority:** P0, Batch 1 (UI part). P0-02b (the `member` role, its authorization matrix, migration and regression tests) is a dedicated later batch per D2.

### P0-03 Expenses search, filter, sort and pagination
- **Status:** 2. The API returns everything in ascending order; the UI reverses the array.
- **Value:** high. Unusable past a few hundred rows.
- **Dependencies:** OpenAPI change to `GET /expenses` (backward-compatible optional query parameters).
- **Code:** `api-server/src/routes/expenses.ts:110-143`, `lib/api-spec/openapi.yaml` (`/expenses`), `pages/expenses.tsx:202`.
- **Acceptance:**
  - Filters: date range, vendor, project, currency, entry type, text in description.
  - Sort by date (default newest first) or amount.
  - Cursor or limit pagination with a total count.
  - Filters reflected in the URL.
  - Export uses the same filters.
- **Tests:**
  - API: each filter, combined filters, pagination boundaries, cross-workspace rows never returned, viewer read access;
  - web: filter state and URL round-trip.
- **Size:** M. **Priority:** P0, Batch 2.

### P0-04 Expense form validation and accessibility
- **Status:** 2. Labels are not linked to inputs, errors are toast-only, currency is free text, categories are AI-only.
- **Value:** high (data quality).
- **Dependencies:** none (reuses `components/ui/form`, `field`, `label`, `currency-selector.tsx`).
- **Code:** `pages/expenses.tsx:114-143, 274-369`.
- **Acceptance:**
  - Every input has a label.
  - Inline errors with `aria-invalid`.
  - ISO currency select, defaulting to the workspace's last-used currency.
  - Server validation messages are shown.
  - Categories include Compute, Storage, Network/egress, Database, AI/LLM API, SaaS subscription, Observability, Other.
  - Refund/credit stays explicit.
- **Tests:** web form tests (invalid amount, more than 2 decimals, bad date, server 400 message displayed); existing money tests unchanged.
- **Size:** S–M. **Priority:** P0, Batch 1.

### P0-05 Navigation, accessibility and honesty fixes
- **Status:** 2.
- **Value:** medium-high. Fixes broken affordances and over-claiming copy.
- **Dependencies:** D7.
- **Code:** `components/layout.tsx:65-111, 178, 205-210, 227-266, 328-335`, `App.tsx:18`, `pages/platforms.tsx:129-138`, `pages/collaboration.tsx:266, 590`, `index.html:7-15`, `public/manifest.json`, `index.css:70-137`.
- **Acceptance:**
  - Nav order: Dashboard, Expenses, Projects, Vendors, Team.
  - "Vendor" naming used throughout.
  - Search control and ⌘ hints removed until real.
  - "All Systems Operational" removed.
  - Theme toggle hidden.
  - Row actions always visible with `aria-label`.
  - Secondary text meets WCAG AA contrast.
  - Reduced motion respected.
  - Metadata and copy describe only live features.
  - Manifest icons fixed or removed.
- **Tests:** web tests for nav items and aria-labels; a test that every nav item is a routed path.
- **Size:** S. **Priority:** P0, Batch 1.

### P0-06 Dashboard v1: period, breakdown, trend
- **Status:** 2. Client-side, all-time totals only.
- **Value:** highest. Answers "what did we spend this month and where".
- **Dependencies:** new contract endpoint `GET /spend/summary` (scope, period, groupBy); P0-03 patterns.
- **Code:** new `api-server/src/routes/spend.ts`; `pages/dashboard.tsx`; reuse `components/dashboard/KpiCard.tsx` and `SpendBreakdownChart.tsx` (remove simulation copy).
- **Acceptance:**
  - Period selector: this month, last month, last 3 months, custom.
  - Per currency (never summed across currencies):
    - net spend, credits and refunds;
    - change against the previous equal period;
    - top vendors and projects;
    - a monthly trend chart for up to 12 months.
  - Empty and error states with next actions.
  - Totals equal the sum of the listed expenses to the cent.
- **Tests:**
  - API: fixture with mixed currencies and refunds; per-currency totals exact; period boundaries (UTC, month ends, leap day); workspace isolation; viewer read access;
  - web: renders multiple currencies without conversion.
- **Size:** M. **Priority:** P0, Batch 2.

### P0-07 Projects: edit, spend and safe delete
- **Status:** 2.
- **Value:** medium-high (allocation is the B2B core).
- **Dependencies:** OpenAPI `PATCH /projects/{id}` if missing; P0-06 aggregation.
- **Code:** `pages/projects.tsx`, `api-server/src/routes/projects.ts`, `lib/db/src/schema/expenses.ts:12-13` (on-delete set null).
- **Acceptance:**
  - Rename and edit description.
  - Spend per project per currency for the selected period.
  - Deleting a project with allocated expenses requires explicit confirmation showing the count, and the result is visible ("unallocated").
  - Page uses `components/ui`.
- **Tests:** API rename authorisation; delete warning count; aggregation per project; web rendering.
- **Size:** S–M. **Priority:** P0, Batch 3.

### P0-08 Vendors page: states and consistency
- **Status:** 2. No error state; naming mismatch.
- **Value:** medium.
- **Dependencies:** P0-05.
- **Code:** `pages/platforms.tsx:51, 88, 127-138, 177, 243-291`.
- **Acceptance:**
  - Error state with retry.
  - Inline form validation.
  - Accessible actions.
  - Vendor type (cloud, AI API, SaaS, other) captured for reporting.
  - Credential field explains that sync is disabled and the field is optional.
- **Tests:** web error state; API unchanged or with a contract-tested `type` field.
- **Size:** S. **Priority:** P0, Batch 1.

### P0-09 Budgets v1: create, edit, status ⚑D8
- **Status:** 4/7/5. Existing `budget_policies` is user-scoped, lifetime and cross-currency; UI page is mock-backed.
- **Value:** high. Table stakes in every competitor.
- **Dependencies:**
  - a new workspace-scoped `budgets` table and migration (the old table is left untouched until D6);
  - OpenAPI endpoints;
  - the P0-06 aggregation.
- **Code:** new `lib/db/src/schema/budgets_v2` (name TBD), new routes, a new page replacing `pages/budgets.tsx` (no mock import).
- **Acceptance:**
  - Budget fields: scope (workspace or project; vendor optional), monthly period, currency, amount, thresholds (default 50/80/100).
  - Status: actual vs budget for the current period in that currency only, with remaining amount and the threshold state reached.
  - Owners and admins edit; members and viewers read.
  - No forecast claims.
- **Tests:**
  - API: CRUD authorisation and isolation;
  - status maths exact to the cent;
  - other currencies excluded;
  - refunds reduce actual;
  - period rollover;
  - migration rehearsal (twice and guard).
- **Size:** M. **Priority:** P0, Batch 3.

### P0-10 Collaboration journey fixes
- **Status:** 2.
- **Value:** medium-high.
- **Dependencies:** P0-01.
- **Code:** `pages/collaboration.tsx:160, 168-181, 260, 285, 341-366`, `pages/accept-invite.tsx:108`.
- **Acceptance:**
  - In Personal scope, the page explains workspaces and offers "Create workspace".
  - Invite links appear in a styled panel with a copy button and expiry.
  - The empty-state copy is correct.
  - The table scrolls on phones.
  - After accepting, the user lands in the joined workspace.
- **Tests:** web tests for the Personal-scope call to action and post-accept selection; existing invite security tests unchanged.
- **Size:** S. **Priority:** P0, Batch 1.

### P0-11 First-run checklist (not a wizard)
- **Status:** 3 (two unmounted wizards promising disabled features).
- **Value:** medium-high (activation).
- **Dependencies:** P0-01, P0-10, P0-12.
- **Code:** `pages/dashboard.tsx`; the old wizards are left in place until D6.
- **Acceptance:**
  - The dashboard empty state shows a checklist driven by real data: create workspace, add a vendor, add or import expenses, invite a teammate.
  - Each item links to the action.
  - It disappears when done.
  - No promises of disabled features.
- **Tests:** web tests for each state.
- **Size:** S. **Priority:** P0, Batch 3.

### P0-12 CSV import with row errors and duplicate prevention
- **Status:** 4 (endpoint live, page unrouted, not in contract).
- **Value:** high. The only bulk path; bridges provider console exports with zero credentials.
- **Dependencies:** P2-01 `external_id`/`source` columns (can land together); OpenAPI entry for `import-batch`.
- **Code:** `pages/import.tsx:88-94`, `api-server/src/routes/expenses.ts` (import-batch), `lib/api-spec/openapi.yaml`.
- **Acceptance:**
  - Column mapping with a preview.
  - Per-row validation report (no `amount || 0` or "Unknown" defaults).
  - Rows already imported with the same `external_id` or file-row fingerprint are skipped and reported. The fingerprint is defined for rows without a provider transaction ID: a hash of normalized date, amount (in cents), currency, vendor, project and description, scoped to the workspace (or user for Personal). Exact repeats are flagged, not silently dropped, because two identical charges can be legitimate.
  - Uniqueness covers Personal rows too: PostgreSQL treats NULL `workspace_id` values as distinct, so add a partial unique index on `(user_id, source, external_id) WHERE workspace_id IS NULL` alongside the workspace index.
  - Imported rows are labelled source=import.
  - A batch is undoable.
- **Tests:**
  - API: re-importing the same file creates zero new rows;
  - a mixed valid/invalid file gives exact counts;
  - workspace isolation;
  - 500-row limit;
  - web: preview and error report.
- **Size:** M. **Priority:** P0, Batch 3.

### P0-13 Export accuracy
- **Status:** 2.
- **Code:** `api-server/src/routes/exports.ts:60, 80`.
- **Acceptance:**
  - CSV adds vendor, project, category and source columns.
  - PDF shows the workspace name and period.
  - Export honours the list filters.
- **Tests:** API CSV columns and escaping; PDF scope label; filters applied.
- **Size:** S. **Priority:** P0, Batch 2.

### P0-14 Responsive layout
- **Code:** page headers `expenses.tsx:165`, `platforms.tsx:127`, `projects.tsx:83`, `collaboration.tsx:285`.
- **Acceptance:** at 375px there is no horizontal page scroll; headers wrap; tables scroll inside their container or stack.
- **Tests:** Playwright viewport smoke test on each live route (local, no external services).
- **Size:** S. **Priority:** P0, Batch 1.

### P0-15 Contract drift
- **Status:** `import-batch`, leave, accept-invite, `invite/:token` and `DELETE members/:id` are mounted but missing from `openapi.yaml`.
- **Acceptance:** all mounted endpoints are in the contract; generated clients are regenerated; a CI test compares mounted routes with the contract.
- **Tests:** the new route-versus-contract test.
- **Size:** S. **Priority:** P0, Batch 1.

### P0-16 Ledger integrity ⚑D3
- **Status:** 2.
- **Value:** medium (correctness and performance).
- **Dependencies:** D3; migration rehearsal.
- **Code:** `lib/db/src/schema/expenses.ts:12-19`, `workspace_members`, `projects`, `platforms`.
- **Acceptance:**
  - `updated_at` on mutable tables.
  - Indexes: `workspace_members(user_id)`, `expenses(workspace_id, date)`, `expenses(project_id)`, `expenses(platform_id)`, `projects(workspace_id)`, `platforms(workspace_id)`.
  - Amount precision per D3, with validation updated consistently in API, web and export.
- **Tests:**
  - migration twice;
  - duplicate guard;
  - money validation at the new precision;
  - export formatting;
  - existing rehearsal suite.
- **Size:** S–M. **Priority:** P0, Batch 2.

### P0-18 Exact amounts in list responses ⚑D3
- **Status:** 2. `GET /expenses` and `GET /expenses/search` return `amount` as a JSON number, as the existing `Expense` schema does. Totals, summaries and exports already use exact decimal strings. Found in the Batch 2 pre-merge review (low severity: 2-decimal values up to 99,999,999.99 round-trip exactly in IEEE doubles).
- **Acceptance:**
  - `Expense.amount` is a decimal string in the contract, the API and the clients.
  - Web and mobile format it with `formatMoney` without parsing to float.
  - Done together with the D3 precision decision, so the contract changes only once.
- **Tests:** contract test; API returns `"100.10"`; web renders the string unchanged; mobile client type check.
- **Size:** S. **Priority:** P1, with D3.

### P0-17 Mock containment and removal ⚑D6
- **Status:** 7 code present in 36 web pages, about 12 API route files, 2 mobile screens and `artifacts/web-dashboard`.
- **Acceptance:**
  - Now: a CI test fails if any routed page or mounted route imports `data/costpilotMockData.ts` or a known mock module.
  - After D6: the approved files are deleted in a dedicated PR.
- **Tests:** the containment test itself.
- **Size:** S. **Priority:** P0, Batch 1 (guard only).

## P1: B2B cost-management capabilities

| ID | Item | Status | Dependencies | Acceptance (summary) | Tests | Size |
|---|---|---|---|---|---|---|
| P1-01 | Trends and historical comparison | 6 | P0-06 | 12-month series per currency; month-over-month and year-over-year where data exists; by vendor/project/category | Exact series on fixtures; month boundaries | M |
| P1-02 | Budget thresholds, variance and alert states ⚑D8 | 6 | P0-09 | Deterministic evaluation (one database-locked job, persisted state, idempotent); alert list in app; variance report per budget and period | Same input gives same state; no duplicate alerts; rollover | M |
| P1-03 | Cost categories per workspace | 2 (fixed list) | P0-04 | Editable category list; reporting by category | CRUD isolation; reassignment | S–M |
| P1-04 | Subscriptions and renewals per workspace ⚑D10 | 4/5 | `resourceScope` port, date types | Interval, seats, currency, owner, renewal date; 30/60/90-day renewal view; renewal-linked expenses | Isolation; date maths; no user-only scoping | M |
| P1-05 | Reports by vendor/provider/project/category | 7 | P0-06, P1-03 | Saved report definitions; CSV/PDF; no mock fallback | Report totals equal ledger | M |
| P1-06 | Activity log | 6 | P0-16 | Append-only event table per workspace: actor, action, entity, changed fields with prior and new values, timestamp, for expenses, budgets, members and vendors; viewable by owner/admin (`updated_at` alone is not enough) | Every write path writes one event; prior and new values correct; isolation | S–M |
| P1-07 | Allocation rules (light) | 6 | P0-07 | Default project per vendor; unallocated spend shown explicitly | Rule application on import and create | M |
| P1-08 | Optional reporting currency ⚑D4 | 6 | D4, FX source | Converted views labelled with rate, source and date; originals untouched | Conversion exactness; missing rate shows as missing | M |

## P2: provider-integration readiness (no live connections)

| ID | Item | Status | Acceptance (summary) | Size |
|---|---|---|---|---|
| P2-01 | Source attribution | 6 | `source`, `external_id` (unique per workspace and source, plus a partial unique index for Personal rows where `workspace_id IS NULL`) and `import_batch_id` on expenses; badges in the UI; manual and imported rows clearly distinguished | S–M |
| P2-02 | Connections data model and UI | 6 | `provider_connections` and `sync_runs` per the AWS design §4; UI shows "Not connected" and setup instructions only; **never** a fake "Connected" | M |
| P2-03 | Import and sync history with retry | 6 | Import batches listed with counts, errors, undo and retry; shared with future sync runs | M |
| P2-04 | Duplicate detection across sources | 6 | Overlap warning when manual and imported rows match vendor, period and amount | M |
| P2-05 | Connector framework, fixture-tested | 6 | Adapter interface plus fixtures; no network calls; kill switch defaults off | M |

A live connector (AWS or OpenAI, ⚑D9) needs separate owner approval: account creation, credentials and costs.

## P3: intelligence (only once data and validation methods exist)

| ID | Item | Precondition |
|---|---|---|
| P3-01 | Deterministic anomaly flags (e.g. day versus trailing median, with explanation) | ≥ 30 days of real data per workspace; a backtest on fixtures |
| P3-02 | Run-rate forecast, labelled with its method | Period aggregation (P0-06); stated error bounds |
| P3-03 | Explainable recommendations (e.g. renewals approaching, unused subscriptions) | P1-04 data; no savings amounts unless computed from the customer's own data |
| P3-04 | AI-assisted analysis | Owner approval of an AI provider and its spend; responses limited to the customer's data, with citations |

Removed or not planned: GPU tools, LLM router, benchmark "market intelligence", tax optimisation, founder mode, fake SSO/SCIM, remediation execution.

## Delivery batches (each a separate PR; none merged without owner approval)

| Batch | Items | Status |
|---|---|---|
| **1. Trustworthy core** | P0-01, P0-02 (UI part), P0-04, P0-05, P0-08, P0-10, P0-14, P0-15, P0-17 (guard) | **Merged to `main` (PR #14, 2026-11-05).** Evidence: [Batch 1 audit](../../audits/2026-11-05_Claude_Batch1TrustworthyCore_Audit.md) |
| 2. Monthly financial view | P0-03 (server filters, sort, pagination), P0-06 (server per-currency totals, period selector, vendor/project/category breakdowns, six-month trend), P0-13 (export accuracy), export cap | **Merged to `main` (PR #16, 2026-11-05)**; phone filter follow-up on `agent/claude/batch2-completion`. Evidence: [Batch 2 audit](../../audits/2026-11-05_Claude_Batch2MonthlyDashboard_Audit.md). No index migration needed (existing indexes verified) |
| 3. Control and ingestion | P0-09 budgets and thresholds, P0-12 CSV import with P2-01 provenance and duplicate prevention, P0-07 projects, P0-11 first-run checklist | **In review, not merged:** budgets (P0-09) on `agent/claude/batch3-budgets` ([audit](../../audits/2026-11-05_Claude_Batch3Budgets_Audit.md)); CSV import (P0-12, P2-01) on `agent/claude/batch3-csv-import` ([audit](../../audits/2026-11-05_Claude_Batch3CsvImport_Audit.md)). P0-07 project spend/rename and P0-11 first-run checklist not started |
| 4. Recurring spend and team | P1-04 subscriptions and renewals (D10), P1-02 in-app alerts (D8), P1-06 activity log, P0-02b contributor role (D2) | Planned |
| 5. Integration readiness | P2-02 to P2-05, AWS design validation (D9; no live connection) | Planned |

P0-16 (ledger integrity): Batch 2 verified the existing indexes cover the new queries; `updated_at` moves to Batch 4 with the activity log (P1-06). Amount precision waits for the D3 decimal-model proposal.

**Follow-ups found in Batch 1:**
- **Done (Batch 2):** expenses use a stacked row layout below `sm`, so the amount is always visible.
- **Done (Batch 2):** dashboard totals use `formatMoney` with each currency's minor units (JPY without decimals, unless cents were recorded).
- **Open:** the Team page's member table still scrolls inside its card on phones; give it a stacked layout below `sm`.
- **Open (from the PR #16 review):** PDF export renders up to 50,000 rows synchronously and blocks the API process while it runs. Render in batches that yield to the event loop, or in a worker. Acceptance: other requests are served during a 50,000-row PDF export, and the output is unchanged.

### Batch 1 acceptance tests

1. **Persistence:** after reloading, the previously selected workspace is still active. If the user was removed from that workspace, the scope falls back to Personal with a notice.
2. **Create workspace:** two users each create "Acme" successfully. The creator is switched into the new workspace, and it appears in the switcher without a reload.
3. **Accept invite:** after acceptance, the joined workspace is active and its expenses are listed.
4. **Viewer:** no add, edit or delete controls on Expenses, Projects or Vendors. A forced 403 shows the server message.
5. **Expense form:**
   - every input has a label;
   - invalid amount, date or currency shows inline errors with `aria-invalid`;
   - a server 400 message is displayed;
   - currency is chosen from an ISO list.
6. **Row actions:** visible without hover, reachable by keyboard, each with an `aria-label`.
7. **Navigation:**
   - every sidebar item routes to a real page;
   - no search control or ⌘ hints;
   - "Vendors" naming used consistently;
   - theme toggle hidden.
8. **Vendors:** a failed load shows an error with retry, not the empty state.
9. **Collaboration:** Personal scope shows the workspace explanation and a call to action; invite links appear in a copyable panel.
10. **Phone width:** at 375px, no horizontal page scroll on any live route (Playwright).
11. **Contract:** a CI test passes showing every mounted API route is in `openapi.yaml`; generated clients are unchanged except for the newly documented endpoints.
12. **Mock containment:** a CI test fails if a routed page or mounted route imports a mock module, and passes on the batch.
13. **Regression:** all existing CI jobs green, including the PostgreSQL rehearsal and the isolation and money tests.

## Batch 3 plan: budgets and CSV import (approved 2026-11-05; implementation in review)

Scope: P0-09, P0-12 (with P2-01 provenance), P0-07, P0-11. One branch, `agent/claude/batch3-budgets-import`; nothing is merged without owner approval. Migrations are rehearsed on the local disposable database only; no production migration.

### Findings in the existing code (not reused)

- **`routes/budgets.ts` (unmounted):**
  - sums every expense the user ever created, in all currencies, as one number;
  - ignores the policy's workspace and project when summing;
  - uses floats.

  It stays unmounted, and the old `budget_policies` table is left untouched (D6).
- **`pages/import.tsx` (unrouted):**
  - turns an unreadable amount into `0` and a missing vendor into "Unknown";
  - sends `{ expenses }` while the API expects `{ transactions }`;
  - promises an "Intelligence Engine".

  It will be rewritten.
- **`POST /expenses/import-batch` (live):**
  - validates each row and its authorization, but stops at the first bad row;
  - has no provenance and no duplicate check.

### Database changes (migration `0002`)

| Change | Detail |
|---|---|
| New `budgets` table | `id`, `workspace_id` (FK, cascade; null for Personal with `user_id` owner), `project_id` and `platform_id` (optional FKs, cascade), `name` (1–80), `currency` (ISO 3 letters), `amount numeric(12,2) > 0`, `thresholds smallint[]` default `{50,80,100}` (each 1–100, ascending), `period` = `monthly` (check), `created_by`, `created_at`, `updated_at`. Unique `(workspace_id, user_id, project_id, platform_id, currency) NULLS NOT DISTINCT` |
| New `import_batches` table | `id`, `user_id`, `workspace_id` (nullable), `file_name`, `row_count`, `inserted_count`, `skipped_count`, `created_at`, `undone_at` |
| `expenses` provenance | `source text not null default 'manual'` (check `manual`/`import`), `external_id text`, `import_batch_id` (FK, set null), `fingerprint text` |
| Duplicate guards | Unique `(workspace_id, source, external_id) WHERE workspace_id IS NOT NULL AND external_id IS NOT NULL`; unique `(user_id, source, external_id) WHERE workspace_id IS NULL AND external_id IS NOT NULL` (NULL workspace values are otherwise distinct); plain index on `(workspace_id, fingerprint)` and `(user_id, fingerprint)` for flagging |
| Lock impact | `ADD COLUMN` with a constant default does not rewrite the table (PostgreSQL 11+). New indexes are built without `CONCURRENTLY` inside the migration; for a populated database, schedule a maintenance window (same note as migration 0001) |

### API (OpenAPI first, contract-tested)

- **`GET/POST/PATCH/DELETE /budgets`:**
  - owners and admins write; members and viewers read;
  - Personal budgets belong to their owner only;
  - project and vendor must belong to the budget's scope.
- **`GET /budgets/status?workspaceId&month`:** for each budget:
  - actual net in the budget's currency only (refunds reduce it), using the Batch 2 spend semantics;
  - remaining amount and percent used;
  - highest threshold reached;
  - other currencies are never counted;
  - no forecast.
- **`POST /imports/preview`** (no writes): validates up to 500 mapped rows and returns a per-row result:
  - `valid`;
  - `invalid` with field messages;
  - `already imported` (same `external_id`);
  - `possible duplicate` (same fingerprint).

  Fingerprint = SHA-256 of normalized date, amount in cents, currency, vendor, project and description, within the scope.
- **`POST /imports`:**
  - inserts the valid rows in one transaction, with `source=import` and the batch id;
  - possible duplicates are inserted only when the user confirms them by row number;
  - already-imported rows are always skipped and counted.
- **`GET /imports`, `DELETE /imports/{id}`:** list batches and undo one (removes that batch's rows; write role required).
- **`POST /expenses/import-batch`:** kept for compatibility, routed through the same validation, and marked deprecated in the contract.

### Web

- **Budgets page** (new; no mock import):
  - per-currency budget list with progress and threshold state;
  - create and edit form with inline validation;
  - read-only for members and viewers.

  The dashboard shows budget status for the selected month.
- **Import page:**
  - upload, column mapping with a preview, then a per-row report (valid, invalid with reasons, duplicates to confirm);
  - import and then undo;
  - phone width supported.
- **Projects:**
  - rename and description;
  - spend per currency for the selected month;
  - delete shows the number of allocated expenses, which become "No project".
- **First-run checklist:** on the empty dashboard, driven by real data (workspace, vendor, expenses, teammate). It disappears when complete and promises no disabled feature.

### Batch 3 acceptance tests

1. **Budget maths:** a USD budget of 100.00 with charges of 80.30 and a −20.00 refund in the month shows actual 60.30, remaining 39.70, 60.3% used, 50% threshold reached. A EUR charge in the same scope does not change it.
2. **Period rollover:** a charge dated the last day of the month counts in that month only; the next month starts at 0.00.
3. **Budget scope:** a project budget counts only that project; a vendor budget only that vendor. Unassigned spend counts only in workspace-level budgets.
4. **Budget authorization:**
   - owner and admin create, edit and delete; member and viewer get 403 on writes and can read;
   - a non-member gets 403;
   - Personal budgets are invisible to everyone else;
   - a project or vendor from another scope gets 400.
5. **Budget validation:** amount ≤ 0, more than 2 decimals, an invalid currency, or thresholds outside 1–100 or unsorted give 400 with a field message.
6. **Import preview writes nothing:** row counts before and after a preview are equal.
7. **Mixed file:** 10 rows (7 valid, 2 invalid amount or date, 1 unknown currency) give exactly 7 valid and 3 invalid, each with a row number and reason; no row is imported with `0` or "Unknown".
8. **Re-import:** importing the same file with `external_id` twice creates 0 new rows the second time and reports 7 already imported, in Personal and in a workspace (partial-index case).
9. **Possible duplicates:** a file repeating a charge without `external_id` flags it. It is imported only when confirmed, and two legitimate identical charges can both be kept.
10. **Atomicity and limit:** a database error mid-import leaves no partial rows; 501 rows give 400.
11. **Import authorization:** a viewer gets 403. Importing into a workspace never writes Personal rows, and the reverse also holds.
12. **Undo:** undoing a batch removes exactly its rows; manual expenses and other batches are unchanged; a second undo gives 409.
13. **Projects:** rename requires a write role; delete reports the allocated count; afterwards those expenses show "No project" and totals are unchanged.
14. **Checklist:** each item reflects real data and disappears when done; none mentions disabled features.
15. **Migration:** `0002` applies twice cleanly on the disposable database, the guard passes, and the existing rehearsal suite stays green.
16. **Regression:** full gate (Gitleaks, mock guard, build, typecheck, API and web tests), 375px check on the new routes, contract test, and all CI jobs green.

### Owner decisions needed before implementation

1. **Personal budgets:** recommended **yes**, owner-only, same rules.
2. **Undo window:** recommended **no time limit in v1**. Undo removes only rows still linked to the batch. An edited row stays linked, so it is also removed and the UI warns.
3. **Possible duplicates:** recommended **flag and require confirmation** (as above), never silently dropped.
4. **Budget alerts:** status on the dashboard and budgets page only. In-app notifications stay in Batch 4 (D8); no email.
