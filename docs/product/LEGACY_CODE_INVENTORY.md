# Unreachable, mock-based and obsolete source: inventory (D6)

**Status:** 2026-11-05, prepared for the owner's decision (Rule 14). **Nothing has been deleted or re-enabled.**

**How the list was made:**
- `MOCK_GUARD_LIST=1 node scripts/mock-guard.mjs` computes every file reachable by import from the enabled entry points.
- This list is every tracked source file under `artifacts/` that is **not** reachable from them. Tests, type declarations and the local e2e harness are excluded.
- Classification comes from reading the source (product assessment of 2026-11-05 and spot checks).
- **Totals:** 229 files.
  - ai-tracker: 123, of which 53 are unused `components/ui` kit files.
  - mockup-sandbox: 63.
  - api-server: 29.
  - mobile-app: 10.
  - web-dashboard: 4.

**Safety today:** none of these files can run on an enabled surface. `scripts/mock-guard.mjs` fails CI if any enabled route or screen imports a fabricated-data module or contains fabrication markers. The API launch scope returns 503 for unmounted features. The web router renders "Page not available" for unrouted paths.

## A. Fabricated or simulated data. Recommendation: delete (needs approval)

These cannot be made honest by re-wiring; each would need a rewrite against real data.

| Area | Files |
|---|---|
| Web pages with hardcoded figures, `Math.random` or mock fallbacks | `artifacts/ai-tracker/src/pages/`: `advanced-settings`, `anomalies`, `api-docs`, `approvals`, `audit`, `auto-pilot`, `auto-pilot-utils`, `aws-bedrock`, `azure-ai`, `benchmarking`, `benchmarks-intelligence`, `budgets`, `cicd-integration`, `comparison`, `compliance`, `cost-centers`, `credit-burn`, `digest`, `entities`, `fine-tuning`, `founder-dashboard`, `gcp-vertex`, `gpu-calculator`, `gpu-waste`, `heatmap`, `intelligence`, `llm-router`, `privacy` (the "Privacy Hub", not the legal page), `remediation`, `report-builder`, `reports`, `reports-utils`, `roi`, `search-hub`, `sso`, `status`, `switcher`, `tagging-rules`, `tax-optimization`, `unit-economics`, `vendor-contracts` (`.tsx`) |
| Web mock data | `artifacts/ai-tracker/src/data/costpilotMockData.ts`. Its only other importer is `src/pages/__tests__/dashboard.test.tsx`, which tests the mock itself and should go with it. |
| Web dashboard widgets with fabricated content | `components/dashboard/RecentActivityTable.tsx`, `SavingsOpportunitiesCard.tsx`, `UpcomingRenewalsCard.tsx`, `AICostAuditCard.tsx` |
| Onboarding wizards promising disabled features | `components/onboarding-wizard.tsx`, `components/onboarding/OnboardingWizard.tsx` |
| API simulators | `artifacts/api-server/src/`: `routes/telemetry.ts` (writes estimated costs as expenses), `routes/analytics.ts`, `routes/audits.ts`, `routes/intelligence.ts` (fake fallback answer), `routes/cicd.ts` (hardcoded forecast), `routes/provisioning.ts` (fake SCIM/SSO), `routes/currency.ts` (static FX), `routes/sync.ts`, `lib/sync-engine.ts`, `lib/cron-service.ts`, `lib/verify_sync.ts`, `services/usage-engine.ts`, `routes/dashboard-activity.ts` ("Connected" status hardcoded) |
| Mobile fabricated screens | `artifacts/mobile-app/src/app/index_original.tsx`, `index_premium.tsx`, `src/components/PremiumComponents.tsx` |
| Orphaned demo app | `artifacts/web-dashboard/` (4 files, not built, hardcoded figures) |

## B. Real but disabled. Recommendation: keep; rework when the backlog item arrives

| Files | Becomes |
|---|---|
| API `routes/subscriptions.ts`, `routes/tools.ts`, `routes/credits.ts` and web `pages/subscriptions.tsx`, `tools.tsx`, `credits.tsx`, `calendar.tsx` | P1-04 subscriptions and renewals. Must move from user-only to workspace scoping first. |
| API `routes/budgets.ts` | Superseded by P0-09 workspace budgets. Its lifetime, cross-currency evaluation must not be reused. |
| API `routes/notifications.ts`, `services/notifications.ts`, web `pages/bot-settings.tsx` | P1-02 alerts (in-app first, per D8) |
| API `routes/dashboard.ts`, `dashboard-summary.ts`, `dashboard-calendar.ts`, `dashboard-utils.ts` | Batch 2 server aggregation. Their sums currently mix currencies and must be rewritten per currency. |
| API `routes/reports.ts` (in-memory schedules) | P1-05 reports |
| API `routes/receipts.ts` (OpenAI vision; fails closed without a key) | P3; needs AI-provider approval |
| API `routes/remediation.ts` (execute returns 501) | Not planned; keep disabled |
| API `routes/sync-mobile.ts`, `lib/audit-emitter.ts` | Review in P1-06 activity log |
| Web `pages/import.tsx` | Batch 3 CSV import. Its `amount ‖ 0` / "Unknown" defaults must be replaced by row errors. |
| Web `pages/settings.tsx`, `integrations.tsx` (fallback provider catalog), `analytics.tsx` (server savings figures) | Settings: P0 account workflows. Integrations: P2 connection UI. Analytics: P3 only with validated methods. |
| Web `components/dashboard/KpiCard.tsx`, `SpendBreakdownChart.tsx`, `BudgetForecastCard.tsx`, `BottomMetricsBar.tsx`, `ConnectedSourcesCard.tsx`, `HeaderAlert.tsx` | Batch 2 dashboard reuse candidates. Wire to real data only. |

## C. Obsolete or unused. Recommendation: delete after approval (low risk)

- `lib/api-client-react/src/workspace-hooks.ts`: hand-written hooks superseded in Batch 1 by hooks generated from the OpenAPI spec. No longer exported.
- `artifacts/api-server/src/lib/encryption.ts`: superseded by `lib/kms-vault.ts`. It **falls back to a random key when `ENCRYPTION_KEY` is unset**, so it must never be re-used. Only its own test imports it.
- Web: `components/app-error-boundary.tsx`, `components/currency-selector.tsx` (a global display currency conflicts with the no-conversion rule), `hooks/use-keyboard-shortcuts.ts`, `hooks/use-mobile.tsx`, `hooks/use-page-performance.ts`, `hooks/use-toast.ts`, `pages/not-found.tsx`.
- Mobile Expo starter leftovers: `src/app/explore.tsx`, `src/components/external-link.tsx`, `hint-row.tsx`, `web-badge.tsx`. Disabled screens `src/app/notifications.tsx` (local-only toggles) and `src/app/subscriptions.tsx` (calls a disabled endpoint) are frozen per D5.
- `artifacts/mockup-sandbox/` (63 files): a component-preview sandbox, not a product surface. Confirm with the owner whether design work still uses it.

## D. Keep as-is

- `artifacts/ai-tracker/src/components/ui/*` (53 unused shadcn files): the design-system kit that later batches build on.
