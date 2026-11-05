# Product development assessment — 2026-11-05

- **Agent:** Claude
- **Baseline:** `main` at `defbcaf`. PR #12 is merged; its code is identical to `19c4e04`.
- **Scope:** a product-focused review of the web app (59 page files), API (30 route files), schema (13 files), OpenAPI contract, mobile app, earlier UI/UX proposals, and the market. No security re-audit, code change, spend, deployment or provisioning.
- **Related documents:**
  - Market research: [`docs/product/MARKET_RESEARCH.md`](../docs/product/MARKET_RESEARCH.md)
  - Backlog: [`docs/product/PRODUCT_BACKLOG.md`](../docs/product/PRODUCT_BACKLOG.md), the single source of truth for priorities.
- **Method:** five parallel reviews (web pages, API/schema, mobile and journeys, UI/UX proposals, market), then direct spot-checks of the key claims against source: workspace context, onboarding mount, routing, launch-scope middleware, slug handling, role enforcement and chart usage.

## 1. CostPilot as a B2B product today

- **What it is:** a manual, multi-currency spend ledger shared across workspaces. Teams record expenses against vendors and projects, invite colleagues with roles, and export CSV/PDF.
- **What it is not yet:** a cost-management product.
  - It cannot answer "what did we spend this month, by vendor or project, against budget?"
  - It cannot ingest spend in bulk or from providers.
- **No reachable screen or endpoint shows fabricated data.** That matches the product rule and is worth protecting.
- **The opportunity** (see the market research):
  - **Who:** small and mid-size engineering teams, roughly under $50k/month of tech spend.
  - **The problem:** cloud, AI API and SaaS subscription spend is scattered across bills, consoles and cards, in several currencies. Incumbents (CloudZero, Finout, CloudHealth) are priced for enterprises; Vantage is closest but caps its cheaper tiers by spend.
  - **The pitch:** one honest ledger with provenance on every line, simple budgets and renewal control, then read-only provider imports.

## 2. Feature-by-feature status

**Legend:**
1. Fully implemented and functional
2. Implemented but incomplete
3. UI only
4. Backend only
5. Intentionally disabled
6. Missing
7. Mock-data only
8. Depends on an external provider

| Feature | Status | Evidence |
|---|---|---|
| Sign-in and account menu (Clerk) | 1 · 8 | `authenticated-app.tsx:41-42`; `UserButton` at `layout.tsx:227`. No in-app sign-up flow (Clerk-hosted) |
| Workspaces: create/rename/delete | 2 | Create is hidden in the switcher dropdown. Slug must be globally unique (`workspace-switcher.tsx:32`, `schema/workspaces.ts:9`). Active workspace is not persisted (`context/workspace-context.tsx:14`) |
| Members, invites, roles | 2 | Invite links are hashed and work. No email; links are copied by hand. Roles are **owner/admin/viewer only**, with no "member" who can record spend without admin rights (`routes/expenses.ts:27`). The UI shows write actions to viewers, which then fail with a generic error |
| Expenses CRUD | 2 | Validated (currency, 2-decimal amounts, dates); refunds stored as negative and labelled. No search, filter, sort or pagination in API or UI (`routes/expenses.ts:110-143`, `pages/expenses.tsx:202`). Currency is free text; errors are generic toasts |
| Bulk import (CSV) | 4 (UI unrouted) | `POST /expenses/import-batch` is live; `pages/import.tsx` is not routed; the endpoint is missing from OpenAPI |
| Receipt scanning | 5 · 8 | Disabled in UI (`expenses.tsx:158-160`); needs OpenAI |
| Projects | 2 | Create/delete only. No rename, no per-project spend. Unstyled page. Deleting a project nulls allocation silently |
| Vendors (platforms) | 2 | CRUD with encrypted, masked credential. No error state (`platforms.tsx:51`). Naming mixes Vendor and Platform |
| Dashboard | 2 | Real data, all-time totals per currency plus 10 recent rows, computed client-side from every expense (`dashboard.tsx:9`). No period, breakdown, trend or chart |
| Budgets | 4 · 7 · 5 | Backend `budget_policies` is user-scoped, unmounted and sums lifetime spend across currencies (`routes/budgets.ts:82-85`). UI page has a mock fallback (`budgets.tsx:129`) |
| Subscriptions / renewals | 4 · 5 | Real CRUD scoped by user, not workspace; text dates; unmounted. UI page unrouted |
| Tools, credits | 4 · 5 | Same as subscriptions |
| Reports | 7 · 5 | `reports.tsx` uses a mock fallback; server schedules live in an in-memory Map (`routes/reports.ts:19`) |
| Export CSV/PDF | 2 | Accurate and scope-limited. CSV has no vendor/project names; PDF shows "Workspace 12" |
| Analytics, forecast, savings, benchmarks | 7 · 5 | Static or heuristic numbers in `routes/analytics.ts`; unmounted |
| Anomalies, cost centers, unit economics, ROI, contracts, approvals, tagging rules | 7 · 5 | Hardcoded or `Math.random` pages, all unrouted |
| AI assistant ("Intelligence") | 7 · 8 · 5 | Fake fallback answer (`routes/intelligence.ts:46-51`) |
| LLM router, GPU tools, telemetry | 7 · 5 | `telemetry.ts` writes estimated costs as expense rows. Must never be mounted |
| Provider sync | 7 · 8 · 5 | Hardcoded token prices in `lib/sync-engine.ts`. `/platforms/:id/*` returns 503 |
| Remediation | 5 | Execute returns 501 |
| Notifications (Slack/Discord) | 4 · 5 | Real CRUD on `webhooks`; unmounted; no delivery log |
| Audit/activity log | 6 | `ai_audits` is a findings table; there is no activity log or `updatedAt` |
| SSO/SCIM | 7 | `provisioning.ts` returns fake data. Clerk can provide SSO later |
| Settings (workspace/account) | 3 (unrouted) / 6 | `settings.tsx` unrouted; no workspace settings beyond rename |
| Search | 6 | Sidebar search leads to an unavailable page (`layout.tsx:178, 205-210`) |
| Onboarding | 3 (unmounted) | Two wizards, neither imported; both promise disabled Stripe ingestion |
| Light theme | 3 (broken) | Toggle exists (`layout.tsx:328-335`) but `:root` and `.dark` are identical (`index.css:70-137`) |
| Mobile app | 2 | Personal-only log: list/add/edit/delete. No workspace, totals or sign-up. Fabricated premium screens are blocked |
| Legal pages | 2 | Drafts ("operator review required"), not linked; contact is a personal address |

## 3. User journeys

**Web: a new engineering-team user**
1. Signs in, then lands on a page titled "Personal expenses". No onboarding.
2. To share with the team, finds "Create workspace" inside the switcher dropdown. A common name such as "Acme" fails if any other customer took it.
3. After creating, is still in Personal. After a reload, back to Personal again.
4. Adds vendors, then types expenses one by one. CSV import exists but is unreachable. Wrong currency codes give "Failed to save expense."
5. Invites a teammate: copies a link manually. In Personal scope the button silently does nothing.
6. Teammate accepts, then lands on Collaboration in Personal scope with an empty list.
7. Dashboard: all-time totals only. Cannot answer "this month" or "by project".
8. Exports CSV: no vendor or project names.

**Web: monthly review (the core B2B workflow)**
- **Not possible:** no period filter, no comparison with the previous month, no budget-vs-actual, no breakdown, no report.

**Mobile**
- A personal expense log only.
- Verdict: freeze it and keep it out of the B2B pitch. Revisit as a companion (budget alerts, quick receipt entry) after P1.

## 4. Major functionality gaps (ranked by customer value)

1. **Period-based visibility:** month-to-date, last month, trend, and breakdown by vendor, project and category, per currency.
2. **Budgets:** workspace and project budgets with thresholds and variance.
3. **Bulk and recurring spend:** CSV import, plus workspace-scoped subscriptions with renewal dates.
4. **Team model:**
   - workspace scope that persists;
   - a contributor ("member") role;
   - role-aware UI;
   - invites that work from every state.
5. **Findability:** search, filters, sorting and pagination on expenses.
6. **Provenance:**
   - a source on each row (manual, import, provider);
   - an `external_id` for duplicate prevention;
   - import history. All three are prerequisites for any provider integration.
7. **Trust:**
   - an activity log;
   - `updatedAt` fields;
   - accurate exports.
8. **Data precision:** `numeric(10,2)` cannot hold sub-cent AI API costs.

## 5. UI/UX weaknesses (ranked by usability impact)

1. **Row actions:** edit and delete appear only on hover and have no labels (`expenses.tsx:238-250`, `platforms.tsx:177`, `collaboration.tsx:325`). They are unusable by touch or keyboard.
2. **Dashboard hierarchy:** none. Ready-made unused components exist: `components/dashboard/KpiCard`, `SpendBreakdownChart` (Recharts 2.15 is installed) and `components/ui/chart`.
3. **Forms:**
   - labels are not tied to inputs;
   - errors appear only as toasts;
   - currency is free text, although `currency-selector.tsx` exists.
4. **Navigation:**
   - the order puts Projects before Expenses;
   - "Vendors", "Vendor Intelligence" and "Add Platform" name the same thing;
   - the search control is dead;
   - the ⌘ hints do nothing;
   - the sidebar says "All Systems Operational".
5. **Error and empty states:**
   - the Platforms page has no error state;
   - the Collaboration page gives no guidance in Personal scope;
   - the shadcn `empty-state.tsx` component is unused.
6. **Consistency:**
   - the Dashboard and Projects pages are unstyled and nest `<main>` inside `<main>`;
   - the other pages use ad-hoc glass styles, not the shadcn `components/ui` set.
7. **Contrast:** slate-500 and slate-600 text on `#09090b` falls below the WCAG AA contrast minimum. Page animations run twice and ignore reduced-motion settings.
8. **Theme:** the light-mode toggle does nothing.
9. **Phone width:**
   - page headers don't wrap;
   - the Collaboration table doesn't scroll sideways;
   - the expenses table is 6 columns.

**Earlier "premium" UI/UX documents:** they target mobile and an orphaned `artifacts/web-dashboard` and claim "integration complete", which is false. Worth keeping: KPI summary, trend versus last period, inline validation and accessibility. Drop the glow, parallax, radar and "breathing" animations: they cost accessibility and add no value for engineering buyers.

## 6. Competitive comparison (summary; details in the market research)

| | Vantage | CloudZero | Finout | CloudHealth | AWS native | CostPilot today |
|---|---|---|---|---|---|---|
| Buyer | Dev-led, SMB to enterprise | Mid/enterprise SaaS | Enterprise FinOps | Enterprise/MSP | Every AWS user | Small eng teams (target) |
| Entry price | Free up to ~$2.5k/mo tracked, $30 Pro | ~$5k+/mo (quote) | ~$2k/mo | % of spend | Free console | — |
| Cloud + AI + SaaS in one view | Partial (integrations) | AI Hub | Yes (MegaBill) | Cloud only | AWS only | Manual ledger only |
| Budgets and alerts | Yes | Yes | Yes | Yes | Yes (free) | No |
| Allocation without retagging | Virtual tags | Yes | Virtual tags | Policies | Cost categories | Single project field |
| Anomaly detection | Yes | ML | ML | Yes | Free, ≥10 days of history | No (correctly) |
| Multi-currency honesty | USD-centric | USD-centric | USD-centric | USD-centric | Billing currency | **Strong:** never converts |
| Manual + SaaS subscription spend | Weak | Weak | Weak | No | No | **Present**, needs workspace scope |

**Where CostPilot can win:**
- one ledger for cloud, AI API and SaaS subscriptions;
- provenance and duplicate-safe reconciliation between manual and imported data;
- honest multi-currency;
- simple threshold budgets and renewal reminders;
- flat low pricing.

**Not to attempt early:**
- ML anomaly detection, Kubernetes allocation, RI/Savings Plan optimisation;
- any write automation;
- an AI gateway proxy;
- SaaS discovery from card feeds.

## 7. Recommended architecture improvements

1. **Server-side aggregation and pagination.**
   - Add a workspace-scoped `GET /spend/summary` (period, groupBy, per-currency) and filtered, paginated `GET /expenses`.
   - Stop downloading every row and filtering in the browser.
2. **One scoping model.** Every resource uses `resourceScope` (personal or workspace with a role). Subscriptions, budgets and categories move off user-only scoping before they are mounted.
3. **Provenance-ready ledger model.** Expense rows gain:
   - `source` (`manual` | `import` | `provider`);
   - `external_id` (unique per workspace and source);
   - `import_batch_id`;
   - `updated_at`;
   - amount precision of `numeric(14,4)`, pending the precision decision.

   Align names with FinOps FOCUS concepts (billed cost, charge period, service, provider) so future imports map cleanly.
4. **Contract-first.**
   - Every mounted endpoint appears in `openapi.yaml`.
   - A CI test fails if a mounted route is missing from the contract.
   - Generated hooks only.
5. **Single feature registry.** Web routes, the sidebar and the API launch-scope allow-list read one list, and a CI test fails if a mock-backed module is reachable.
6. **Quarantine, then delete, preview code** (deletion needs owner approval, Rule 14). Until then, nothing under the mock-backed list may be mounted.
7. **Design system.**
   - Live pages adopt `components/ui` (shadcn) and the existing tokens.
   - Add an accessible table and form pattern once and reuse it.
8. **Deterministic jobs later.** Budget evaluation and renewal reminders run as one database-locked job with persisted state and a delivery log, not in-memory timers.

## 8. Roadmap and backlog

- See [`docs/product/PRODUCT_BACKLOG.md`](../docs/product/PRODUCT_BACKLOG.md). It is ordered P0 (core completeness), P1 (B2B cost management), P2 (provider-integration readiness), P3 (intelligence).
- Each item lists its current status, business value, dependencies, acceptance criteria, tests, size and code locations.

## 9. First implementation batch

- Proposed in the backlog under "Batch 1".
- It needs owner approval of the open product decisions that affect it (backlog §0) before work starts.

## 10. Not verified

- The web UI was not run in a browser, because Clerk's hosted sign-in is unreachable from the agent environment. Findings come from source and were spot-checked.
- Competitor facts are mostly from search summaries; several vendor sites were blocked. Labels are in the research document.
- No interviews with real users.
