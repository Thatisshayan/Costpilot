# Batch 3A — Monthly budgets — 2026-11-05

- **Agent:** Claude
- **Branch:** `agent/claude/batch3-budgets`. CSV import is a separate PR (Batch 3B).
- **Scope (owner-approved 2026-11-05):**
  - workspace and project budgets;
  - monthly periods;
  - spent vs budget, remaining and thresholds;
  - in-app alerts;
  - refunds;
  - one currency per budget;
  - role-based access.
- **Not done:** no deployment, paid service or production migration. Migration `0002` was applied only to the local disposable database.

## Existing code reviewed (not reused)

- **`routes/budgets.ts` and the `budget_policies` table (unmounted legacy):**
  - sums every expense the user ever created, in all currencies, as one float;
  - ignores the policy's workspace and project.

  Both are left untouched and unreachable (D6).
- **`pages/budgets.tsx` (unrouted, mock-backed):** left untouched. The new page is `pages/monthly-budgets.tsx`.
- **Reused:**
  - the Batch 2 spend semantics (`scopeCondition`, `monthPeriod`, `toCents`/`fromCents`);
  - `resourceScope`;
  - `getWorkspaceMember`;
  - the form, error and money-format helpers.

## Design

| Area | Decision |
|---|---|
| Table | New `budgets` table (migration `0002`, additive only). Scope is Personal (`workspace_id` NULL, owner only) or a workspace, optionally one project from that scope. Fields: `currency`, `amount numeric(12,2) > 0`, `thresholds smallint[]` (default 50/80/100), `period = monthly`. Database checks enforce currency format, amount, name length and threshold count |
| Uniqueness | One budget per scope + project (or none) + currency. Two partial unique indexes, one for Personal (where `workspace_id IS NULL`, since NULLs are distinct) and one for workspaces → 409 |
| Cascade | Deleting a workspace or project deletes its budgets. A project budget is never silently widened to the whole workspace; the projects page says so before and after deletion |
| Actual spend | One grouped SQL sum per request: scope, month (expense date; current month to today UTC) and currency. Net = charges + credits, so refunds reduce spending. Only the budget's currency counts; nothing is converted or forecast |
| Maths | `lib/budget-math.ts`, in BigInt cents: remaining; percent used rounded half away from zero to 0.1; highest threshold reached (exact integer comparison); state `ok`/`alert`/`over` |
| Access | Viewers read. Owners and admins create, edit and delete; the write is re-checked inside the UPDATE/DELETE statement. Non-members get 403 on lists and 404 on ids. Personal budgets are visible to their owner only. A project from another scope gets 400 |
| Edits | Name, amount and thresholds can change. Scope, project and currency are fixed (delete and recreate) |
| In-app alerts | The dashboard shows a "Budget alerts" panel for the current month, listing each budget at or past a threshold or over its amount, in its own currency. Computed on load; no email and no stored notifications (persistent alerts are Batch 4, D8) |
| Web | New `/budgets` page (nav item "Budgets"): month selector (server's current month by default), per-budget progress, spent, remaining or "over by", charges and refunds, thresholds, create/edit/delete with inline validation and server messages, and a read-only notice for viewers |

## Endpoints (OpenAPI first, clients regenerated)

- `GET /budgets?workspaceId`
- `POST /budgets`
- `PATCH /budgets/{id}`
- `DELETE /budgets/{id}`
- `GET /budgets/status?workspaceId&month`

## Tests

| Area | Evidence |
|---|---|
| Maths (unit) | `budget-math.test.ts`, 15 tests: refunds reduce actual; threshold reached exactly at the boundary; 100% is an alert and over only above the amount; net credit; half-away rounding; threshold validation |
| Database (PostgreSQL 16 rehearsal) | All checked to the cent: USD budget 100.00 against 100.30 charges − 20.00 refund gives 80.30, 19.70 remaining, 80.3%, alert at 80; EUR and JPY never counted. Project budget 100.10 → over by 0.10. October starts again at 5.00. Viewer reads and gets 403 on writes; non-member gets 403 or 404. Personal isolation. 409 duplicates (workspace and Personal). Cross-scope project 400. 8 invalid bodies 400. Amount change 200 → 40.2% ok. Project deletion cascade. Migration applied twice |
| Bug found by the rehearsal | `amount: "1.234"` returned 500 (the positivity check ran after the format check failed). Fixed; now 400 |
| Web | Budgets page (11 tests), form helpers (3), dashboard alerts (2), navigation (updated) |
| Phone width | 28 route/role/scope combinations fit 375px, including `/budgets` (screenshot inspected) |

## Owner decisions

1. **Alert delivery:** in-app only for now (D8). Should persistent and dismissible alerts, or email, come in Batch 4?
2. **Budget periods:** monthly only. Quarterly or annual budgets were not requested.
3. **Vendor-level budgets:** not built (not in the approved list). They can be added with the same model.
