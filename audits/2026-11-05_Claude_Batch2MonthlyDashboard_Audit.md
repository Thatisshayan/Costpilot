# Batch 2 — Monthly financial dashboard — 2026-11-05

- **Agent:** Claude
- **Branch:** `agent/claude/batch2-monthly-dashboard`, **stacked on PR #14** (`agent/claude/batch1-trustworthy-core`).
- **Scope (owner-approved):** monthly totals, breakdowns, period comparison, server-side expense discovery, consistent exports, responsive and accessible UI.
- **Not done:** no deployment, paid service, provider connection or production migration. No schema change was needed.

## Why stacked on PR #14

Batch 2 builds directly on Batch 1:
- the rewritten expenses page;
- the workspace role context and `lib/api-error.ts`;
- the OpenAPI contract test, which requires new endpoints to be documented.

Starting from `main` would have duplicated that code or produced heavy conflicts in the generated clients. The Batch 2 PR targets the Batch 1 branch, so its diff shows only Batch 2. **It can merge only after PR #14.**

## Financial semantics (one implementation, shared by dashboard, search and export)

`artifacts/api-server/src/lib/spend-math.ts` (pure) and `lib/spend.ts` (SQL) define:

| Rule | Implementation |
|---|---|
| Exact money | Sums use PostgreSQL `numeric`; amounts cross the API as 2-decimal strings and are handled as integer cents (`BigInt`); never floats |
| Currencies | Totals per currency only, never converted or combined |
| Refunds and credits | Negative amounts. `net = charges (≥ 0) + credits (< 0)`; both parts are shown |
| Month attribution | An expense counts in the month of its `date` (the charge date entered), not its creation time |
| Current month | Partial: runs to today (UTC). Future months return 400 |
| Comparison | A partial month is compared with the same days of the previous month, clamped to that month's length (e.g. Mar 30 compares with Feb 28). A complete month is compared with the complete previous month. The basis is returned and stated in the UI |
| Percentage change | Rounded half away from zero to 0.1. **Null when the previous net is zero or negative**; the UI explains why rather than showing a misleading % |
| Scope | Personal (own rows, no workspace) or one workspace with active membership (viewers can read; non-members get 403). Vendor and project names join only within the expense's own scope |
| Search filters | Text (escaped: `%` and `_` match literally), date range, signed amount range, vendor/project (or "none"), category, currency, type. Totals cover all matching rows, not just the page |
| Export | Same filters and scope; exact 2-decimal amounts; vendor, project and workspace names; per-currency totals in the PDF; **capped at 50,000 rows** (413) |

## Endpoints (OpenAPI first, clients regenerated)

- `GET /spend/summary?workspaceId&month`: per-currency net, charges, credits and count; previous net; change amount and percent; breakdowns by vendor, project and category; six-month trend.
- `GET /expenses/search`: filters, sort (date or amount, either direction), `limit` ≤ 100, `offset`, per-currency totals.
- `POST /exports/generate`: optional `filters`; 413 above the cap.

## Indexes reviewed

No migration was needed. On 200,000 local rows, the existing `expenses_user_date_idx` serves Personal month queries and `expenses_workspace_date_idx` serves workspace month queries. Both use index scans, with execution under 1 ms (`EXPLAIN ANALYZE`).

## Web

- **Dashboard (`pages/dashboard.tsx`):**
  - month selector, defaulting to the current month to date;
  - one card per currency (net, charges, refunds/credits, change);
  - a stated comparison method;
  - per-currency breakdowns that link to the matching filtered expenses;
  - six-month trend;
  - loading, empty and error states;
  - the add action is hidden for read-only roles.
- **Expenses (`pages/expenses.tsx`, `lib/expense-query.ts`):**
  - server search with labelled filters, inline validation (from > to, malformed amounts) and URL state using the API parameter names plus `page`;
  - 25 per page, with per-currency totals;
  - stacked cards below `sm`;
  - exports send the active filters.
- **Formatting (`lib/money-format.ts`):** uses each currency's own minor units (JPY 0, USD 2, KWD 3) and never converts.

## Tests

| Area | Evidence |
|---|---|
| Money and periods | `spend.test.ts`, 21 tests: cents round-trip, no float drift (1000 × 0.01 = 10.00), rounding, null baseline, partial and leap months, year boundaries, future months |
| Database (real PostgreSQL 16 rehearsal) | Fixture in 3 currencies with refunds, checked to the cent: USD net 80.30 = charges 100.30 + credits −20.00, previous 80.00, +0.4%. EUR against a zero baseline gives `null`. JPY 1500.00. Breakdowns by vendor, project and category including unassigned; trend; partial-month same-days comparison; viewer 200, non-member 403, Personal isolation; future and malformed months 400 |
| Search | Pagination and sort, totals equal the summary, vendor-name text search, literal `%`, "none" filters, type and amount filters, 6 invalid queries rejected, Personal never sees workspace or other-account rows |
| Export | CSV row sums per currency equal the summary in cents; workspace name on every row; unknown filter keys 400; 50,001 rows → 413, a narrowed export → 200 |
| CSV safety | Plain signed decimals such as `-4.50` stay unescaped; formula look-alikes are still neutralised (`csv.test.ts`) |
| Web | Dashboard (9 tests), money formatting (4), expense query (7), expenses search page (17), Batch 1 suites updated |
| Phone width | 24 route × role × scope combinations fit 375px (local Chromium; sign-in stubbed, API from fixtures); dashboard and expenses screenshots inspected |
| Full gate | `node scripts/verify.mjs`: gitleaks on the 5 Batch 2 commits and the files at HEAD, mock-guard (188 files), build, typecheck; API 199 tests, web 133 tests |

## Decisions recorded as assumptions (owner to confirm)

1. **"Today" uses UTC** for the current month; there is no workspace time-zone setting yet.
2. **Month attribution uses the expense date,** not the creation date.
3. **Amount filters compare signed amounts,** so a minimum of 10 excludes a −50 credit.
4. **Comparison basis:** same days for a partial month, full previous month otherwise.

## Codacy

- **Finding 86** (unbounded export loop, from PR #8) is **Fixed** by the 50,000-row cap; the register is updated.
- Codacy reports **12 new findings on this PR** (10 high, 2 medium). They could not be identified from this environment and are recorded in the [register](../docs/security/CODACY_REMEDIATION_REGISTER.md) as accepted residual risk for internal development merges only (owner decision, 2026-11-05).

## CodeRabbit review (14 minor comments, 1 follow-up, 2 nitpicks)

All were checked against the code. Fixed on this PR before merging:

| Comment | Fix |
|---|---|
| JPY stored with cents (e.g. 1500.49) displayed as ¥1,500 | `formatMoney` never hides recorded cents (¥1,500.49) |
| Previous workspace's rows shown while the new scope loads | The previous page is kept only within the same scope; otherwise the loading state shows |
| Search debounce could overwrite a filter chosen within 300 ms | The effect depends on the latest query (web test) |
| Export enabled with invalid filters (HTTP 400 for the user) | Export buttons disabled until the filters are valid; filters are never dropped |
| `minAmount` > `maxAmount` accepted (empty results) | 400 on search and export (rehearsal) |
| Deep link `page=40002` exceeded the offset limit | Page clamped to 40,001 |
| Years 0000–0099 mis-validated (`Date.UTC`) | `setUTCFullYear`; the new test also exposed unpadded years in month periods, which is fixed |
| `category=""` missed empty-string categories | Matches NULL or `""`; the dashboard groups both as uncategorised |
| Summary and search read in separate statements | Each request reads in one `repeatable read`, read-only transaction |
| PDF intro said totals were absent | Wording corrected |
| "No spend in either period" when charges and refunds cancel out | "Net is zero in both periods" |
| `offset` maximum missing from the spec | Added and clients regenerated |
| Backlog follow-ups out of date | Updated; the member-table phone layout stays open |
| Nitpicks | Uncategorised drill-down link test; real `ExportButtons` request-body test |

**Deferred with acceptance criteria (backlog):** the synchronous PDF rendering, which predates this PR and is bounded by the 50,000-row cap.

## Follow-ups

- **Phone filters — DONE (follow-up branch `agent/claude/batch2-completion`):** below `sm`, only Search shows by default. A "More filters" button (`aria-expanded`, `aria-controls`, with a count of active filters) reveals the rest. The panel stays open while a filter is invalid, so errors are never hidden. Tests: 2 page tests, 1 unit test (`activeFilterCount`); the 375px check passes in all 24 combinations.
- **Live sign-in:** a real Clerk sign-in was not exercised here, so the phone-width check uses stubbed sign-in.
- **Low-severity edge cases from the pre-merge review** (no critical, high or medium findings). Dispositions on `agent/claude/batch2-completion`:
  1. **Fixed:** drill-down links did not always select the rows the dashboard counted. The dashboard now groups a legacy empty-string category as uncategorised, and `category=` matches NULL or `""`. `platformId=none`/`projectId=none` now mean "no vendor or project from the expense's own scope", matching the "unassigned" group, so an out-of-scope vendor id is found but never named. Rehearsal cases added.
  2. **Fixed:** the dashboard's default month is now the server's current month (no `month` parameter), and the selector never offers a later month. A browser clock ahead of the server can no longer cause a 400. Web test added.
  3. **Recorded:** `amount` is a JSON number in list responses (existing contract). Backlog P0-18, with D3.
  4. **Fixed:** a blank or whitespace-only `q` is ignored instead of returning 400. Rehearsal case added.
