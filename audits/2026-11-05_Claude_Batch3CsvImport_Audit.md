# Batch 3B — CSV import — 2026-11-05

- **Agent:** Claude
- **Branch:** `agent/claude/batch3-csv-import`, stacked on `agent/claude/batch3-budgets`. Its migration `0003` follows budgets' `0002`. Merge only after the budgets PR.
- **Scope (owner-approved 2026-11-05):**
  - upload and preview;
  - column mapping and validation;
  - Personal or workspace target;
  - source attribution;
  - duplicate detection and repeat-import protection;
  - row-level errors;
  - size and row limits;
  - negative amounts and currencies;
  - workspace isolation.
- **Not done:** no deployment, production migration, provider connection or customer data. Migration `0003` was applied only to the local disposable database.

## Existing code reviewed

- **`pages/import.tsx` (unrouted legacy):** not reused and left untouched. It:
  - turned unreadable amounts into `0` and missing vendors into "Unknown";
  - sent a body the API rejects;
  - promised an "Intelligence Engine".
- **`POST /expenses/import-batch` (live):**
  - kept for compatibility and marked `deprecated` in the contract;
  - its rows are now attributed `source = import`;
  - its validation helpers (scope-checked vendors/projects, money rules) informed the new route.

## Design

| Area | Decision |
|---|---|
| Migration `0003` (additive) | New `import_batches` table. New `expenses` columns: `source` (default `manual`, checked against `manual`/`import`), `external_id` and `import_batch_id` (FK, set null). Two partial unique indexes on `(scope, source, external_id)`: one for workspaces and one for Personal (NULL `workspace_id`). Existing rows become `manual`. The check and unique indexes are built without `CONCURRENTLY`, so on a populated database schedule a maintenance window (same note as 0001) |
| Browser | Parses the file (Papa Parse) and checks: `.csv` only, ≤ 1 MB, ≤ 500 rows, a header row. The user maps columns (guessed from common provider headers) or picks one currency for every row. Cells are sent as text; nothing is parsed to a float or defaulted |
| Server rules (`lib/csv-import.ts`, `routes/imports.ts`) | Every row is re-validated: a real calendar date; an exact signed amount (≤ 2 decimals, negative = refund/credit, BigInt cents); an ISO currency; text length limits reported on the row. Vendor and project names must match exactly one vendor/project in the target scope (case-insensitive); otherwise the row is invalid. A vendor from another scope is never used |
| Duplicates | A repeated external ID in the file is invalid. An external ID already imported into the scope → `already_imported` (skipped). A row identical to an existing expense or an earlier row (date, amount, currency, vendor, project, description) → `possible_duplicate`, imported only when the user confirms that row. A concurrent import of the same external ID is absorbed by the unique index (`ON CONFLICT DO NOTHING`) |
| Atomicity | The batch record and all its rows are written in one transaction |
| Access | Owners and admins import into a workspace; anyone imports into their own Personal scope. Viewers and non-members get 403. Members can list batches. Undo needs a write role; it is claimed atomically, so a second undo gets 409 |
| Undo | Deletes exactly the rows created by that batch, including rows edited since (the UI says so); manual expenses and other batches are untouched |
| Provenance | `source` is returned by expense search, shown as "CSV import" on expense rows, and exported as a new CSV `Source` column. No provider sync writes expenses |
| Web | New `/import` page (nav item "Import"): choose file → match columns → row report (counts; per-line errors; confirm possible duplicates) → import into the active scope, named on the button → recent imports with undo. Read-only notice for viewers |

## Endpoints (OpenAPI first, clients regenerated)

- `POST /imports/preview` (no writes)
- `POST /imports`
- `GET /imports?workspaceId`
- `DELETE /imports/{id}` (undo)

## Tests

| Area | Evidence |
|---|---|
| Rules (unit) | `csv-import.test.ts`, 17 tests: exact signed cents; 10 malformed values rejected rather than defaulted; all problems reported at once; over-long cells reported per row; 500-row limit; strict body; duplicate row numbers; match key |
| Database (PostgreSQL 16 rehearsal) | 11-line file → 7 valid, 4 invalid, reported by line (bad amount, impossible date, bad currency, vendor from another scope); preview writes nothing; viewer and non-member 403; 501 rows 400. Import → 7 rows; June net USD 19.75 (refund included), EUR 1.00, JPY 6.00 separate; the dashboard agrees. Re-import → 0 rows, 7 already imported. Look-alikes flagged against existing rows and earlier lines; imported only when confirmed. Personal repeat-import blocked separately from the workspace. Batch listed for members; viewer undo 403, non-member 404, owner undo removes exactly 7, second undo 409. Export rows labelled "CSV import". Migrations applied twice |
| Web | Import page (9 tests), mapping (3), navigation (updated) |
| Phone width | 32 route/role/scope combinations fit 375px, including `/import` (screenshot inspected) |

## Independent review (before opening the PRs)

A separate reviewer found no critical or high issues. All six findings were fixed:

1. **Medium – concurrent imports could duplicate rows without transaction IDs.** The look-alike check now runs inside the import transaction, under a per-scope lock (`pg_advisory_xact_lock`). The rehearsal fires 3 simultaneous imports of one file: exactly one inserts. The test fails when the lock is removed.
2. **Medium – the import page kept a previewed file and its confirmations after a workspace switch.** It now remounts per scope (web test).
3. **Low/Medium – a NUL byte caused a 500.** It is now a row error; NUL in a file name or budget name gives 400 (unit and rehearsal tests).
4. **Low – the row report could call a row "valid" after it lost a race.** Such rows are now reported as already imported, and a batch where nothing landed is rolled back.
5. **Low – the budget form kept a project from the previous scope.** The budgets page also remounts per scope (web test).
6. **Low – spec drift.** The OpenAPI spec now states `rowNumber` maximum, `confirmDuplicateRows` `maxItems` and 404 for malformed budget ids.

## Owner decisions

1. **Unknown vendors/projects:** currently a row error ("add it on the Vendors page"). Alternative: offer to create them during import.
2. **Undo window:** currently unlimited, and undo also removes rows edited after import. Alternatives: a time limit, or keeping edited rows.
3. **Larger files:** 500 rows / 1 MB per import. Raise the limit or import in chunks?
4. **Production migration:** `0002` and `0003` must be applied to any shared database only with approval, in a maintenance window if `expenses` is large.
