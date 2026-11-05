# Product assessment — 2026-11-05

- **Agent:** Claude
- **Baseline:** `main` at `defbcaf` (PR #12 merged; code identical to `19c4e04`).
- **Scope:**
  - read-only review of the web app (all 59 page files), the API (all 30 route files and the 13 schema files) and the mobile app, plus the first-run journey and the product claims;
  - no security re-audit (see the earlier audits);
  - no code changed; no spend, deploy or provisioning.
- **Method:** three parallel code reviews, then spot-checks of the key claims against source (workspace context, onboarding mount, routing, launch-scope middleware, slug handling).

## 1. What the product is today

CostPilot ships a **manual, multi-currency spend ledger shared across workspaces**. It is gated twice: web routes (`ai-tracker/src/App.tsx`, `lib/launch-scope.ts`) and the API allow-list (`api-server/src/middlewares/launch-scope.ts`), which returns 503 for everything else.

| Live feature | Status |
|---|---|
| Sign-in (Clerk) | Works; invite links survive sign-in |
| Expenses | Create/edit/delete; refunds/credits negative and labelled; ISO currency checked on the server; never converted |
| Vendors (platforms) | Create/edit/delete; credential encrypted and masked; sync disabled |
| Projects | Create/delete only |
| Dashboard | All-time net totals per currency plus the 10 most recent expenses |
| Workspaces | Create, roles, invite by link, accept, remove, leave, rename, delete |
| Export | CSV/PDF for one scope |

**No reachable screen or endpoint shows fabricated data.** That is the most important result.

## 2. What is not live, and why it matters

- **Hidden from users:**
  - 47 sidebar items reduce to 5 visible ones;
  - 20 of the 30 API route files are never mounted;
  - 36 web pages are unrouted previews.
- **Fabricated numbers sit in that hidden code:**
  - web: 22 pages are pure mock and 12 use live data with a **mock fallback**. Re-routing `reports`, `budgets` or `founder-dashboard` would show mock figures immediately (`reports.tsx:102`, `budgets.tsx:129`, `founder-dashboard.tsx:36`);
  - API: `telemetry.ts` `/chat/completions` writes **estimated costs as real expense rows**; `analytics.ts` savings and benchmarks are static; `audits.ts` `/scan` persists a canned finding; `intelligence.ts:46-51` returns a fake answer on error; `cicd.ts` `/forecast` is hardcoded; `provisioning.ts` SCIM/SSO are fake; `currency.ts` uses a static FX table;
  - mobile: `index_original.tsx` and `index_premium.tsx` hold made-up totals and a "Sync" button that posts a fake expense;
  - `artifacts/web-dashboard` is a second dashboard with hardcoded figures.
- **Not reachable but backed by real data:**
  - subscriptions, tools, credits, budgets and notifications have real database code but are scoped by user, not workspace;
  - the CSV import page posts to an allowed endpoint (`/expenses/import-batch`) but is not routed.

**Risk:** the gates are the only barrier. One routing change could expose fabricated spend, which breaks the core product rule. Deleting or quarantining this code needs owner approval (Rule 14).

## 3. First-run journey: friction, worst first

1. **No onboarding.** Neither wizard is mounted, and both promise disabled Stripe ingestion. A new user lands on "Personal expenses" with no guidance.
2. **Workspace scope is fragile:**
   - the active workspace is `useState(null)` (`context/workspace-context.tsx:14`), so every reload resets to Personal;
   - creating or joining a workspace neither selects it nor refreshes the list (`workspace-switcher.tsx:29-41`, `accept-invite.tsx:108`);
   - teams think their data has vanished.
3. **Workspace creation fails on common names.** It is hidden in the switcher dropdown, and the slug (`name → kebab`, `workspace-switcher.tsx:32`) must be globally unique (`lib/db/src/schema/workspaces.ts:9`). A second "Acme" anywhere fails with a generic toast.
4. **Bulk entry is unreachable.** Subscriptions and CSV import are off, so all spend must be typed in one expense at a time.
5. **Invites are hand-copied links.** In Personal scope, "Create Invite" silently does nothing (`collaboration.tsx:160`).
6. **The dashboard is not a B2B view:**
   - all-time totals only, with no period, vendor or project breakdown;
   - every expense is downloaded and filtered in the browser, with a refetch every 30 s;
   - `toFixed(2)` misformats JPY/KRW.
7. **Expenses list problems:**
   - not date-sorted (`[...expenses].reverse()`);
   - no filters, search or pagination (API included);
   - edit/delete visible only on hover, with no aria-label;
   - currency is free text;
   - server validation errors appear as "Failed to save expense.";
   - categories are AI-only, with nothing for compute, storage or egress.
8. **Dead ends and over-claims:**
   - Quick search goes to an unavailable page;
   - ⌘ shortcut hints are shown but not wired;
   - the sidebar says "All Systems Operational";
   - copy promises "AI audits, manage budgets" and "forecast and control" (`index.html`, `manifest.json` — which also references missing icons — `collaboration.tsx:266`, `platforms.tsx:130`);
   - Vendor/Platform naming is inconsistent;
   - styling is mixed across pages.
9. **Exports:** the CSV has no project or vendor name; the PDF says "Workspace 12" instead of the name.

## 4. Data model gaps for B2B

| Gap | Effect | Size |
|---|---|---|
| Subscriptions/tools/credits scoped by user, not workspace; text dates; no interval, seats, currency or owner | Recurring SaaS/AI spend, the largest B2B use case, can't be tracked by a team | M |
| Budgets: threshold only; no period, currency, tiers or alert history; `/evaluate` sums lifetime spend across currencies (`budgets.ts:82-85`) | No budget control | M |
| No server-side aggregation by period, currency, vendor or project | Dashboard can't scale or answer "what did we spend this month" | M |
| `expenses.amount numeric(10,2)` | Can't store sub-cent AI/API unit costs; blocks the AWS design | S (migration; no production database exists) |
| No external-ID/idempotency key on expenses | Re-imports and future syncs duplicate rows | S |
| `GET /expenses`: no pagination, filters or sort | Breaks past a few thousand rows | S–M |
| No activity log; no `updatedAt` | Teams can't see who changed what | S–M |
| No cost centers/teams or normalized tags; one project per expense | Limited chargeback | M–L |
| Deleting a project/vendor nulls expense allocation silently | Allocation loss | S |
| Missing indexes: `workspace_members(user_id)`, `expenses(project_id/platform_id)`, `projects`/`platforms(workspace_id)` | Performance as data grows | S |
| Contract drift: `import-batch` and 4 workspace endpoints are not in `openapi.yaml` | Generated clients are incomplete | S |

## 5. Mobile verdict

**Freeze; exclude from the B2B pitch.**

- It is a personal-only expense log with no workspace view, no totals and no sign-up, and it does less than the web app.
- The blocked screens hold the only fabricated mobile data.

## 6. Recommended roadmap (before any infrastructure spend)

Ordered by customer value per unit of risk. None of it needs paid services, deployment or provider credentials.

**P1 — Usable by a team (≈ 6–8 days)**
1. **Workspace-first:**
   - persist the active workspace;
   - auto-select it after create/join;
   - server-generated unique slugs;
   - readable conflict errors. (S)
2. **Minimal honest onboarding:** create workspace → add vendor → add or import expenses → invite. No Stripe or AI promises. (S–M)
3. **CSV import:**
   - route the page;
   - add `import-batch` to the contract;
   - row-level error report;
   - dedupe via a new `external_id` unique per workspace. (S–M)
4. **Expenses list:**
   - server pagination, filters (date range, vendor, project, currency) and date sort;
   - visible, accessible row actions;
   - ISO currency picker;
   - server messages shown;
   - cloud categories added. (M)
5. **Dashboard:**
   - workspace-scoped server aggregation per currency;
   - period selector;
   - by-vendor and by-project breakdowns;
   - month-over-month change;
   - currency-aware formatting. (M)
6. **Small fixes:** project rename and spend per project; exports with vendor/project/workspace names. (S)

**P2 — Recurring-cost control: the B2B value (≈ 8–10 days)**
7. **Subscriptions and renewals per workspace:**
   - interval, seats, currency, owner, real dates;
   - a renewal list for the next 30/60/90 days. (M)
8. **Budgets per workspace/project and month, per currency:**
   - 50/80/100% states shown in the app;
   - email or Slack delivery later. (M)
9. **Activity log:** add `updatedAt` everywhere. (S–M)
10. **Data precision and integrity:**
    - `amount` to `numeric(14,4)`;
    - foreign-key behaviour that doesn't silently unallocate;
    - missing indexes;
    - contract drift fixed. (S)

**P3 — Honesty and hygiene (≈ 1–2 days; part needs Rule 14 approval)**
11. Fix over-claiming copy and metadata, the dead search and shortcut hints, and the sidebar status badge. (S, no approval needed)
12. Remove the mock fallbacks and fabricated preview code (web pages, `data/costpilotMockData.ts`, fabricated API routes, mobile `index_original`/`index_premium`, `artifacts/web-dashboard`). **Deletion needs owner approval**; until then, the gates stay and a CI guard can fail if a mock-backed route is mounted. (S)

**Then:** staging (hosting approval), live acceptance and a private pilot. The AWS v1 integration (design in `docs/design/AWS_COST_INTEGRATION_V1.md`) reuses P1 item 3's `external_id`, P1 item 5's aggregation and P2 item 10's precision change, so P1 and P2 also shorten AWS M1–M5.

## 7. Not verified

- The web UI was not run in a browser: Clerk's hosted sign-in is not reachable from the agent environment. Findings come from code and were spot-checked against source.
- No usability testing with real users.
