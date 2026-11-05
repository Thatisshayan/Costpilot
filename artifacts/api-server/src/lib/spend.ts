// Shared spend semantics for the dashboard summary, expense search and exports, so all
// three agree to the cent.
//
// - Money is summed by PostgreSQL `numeric` (exact) and handled here as integer cents (BigInt),
//   never as floating point.
// - Amounts stay in their recorded currency: totals are per currency and never converted.
// - Negative amounts are refunds/credits. net = charges (positive rows) + credits (negative rows).
// - An expense belongs to the month of its `date` (the charge date entered by the user),
//   not the day it was recorded. Dates are calendar dates; "today" is taken in UTC.
import { and, eq, gte, ilike, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { expensesTable, platformsTable, projectsTable } from "@workspace/db";

export type Scope = { userId: string; workspaceId: number | null };

/** Rows in exactly one scope: Personal (own, no workspace) or one workspace. Callers must
 * have verified workspace membership before using a workspace scope. */
export function scopeCondition({ userId, workspaceId }: Scope): SQL {
  return workspaceId === null
    ? and(isNull(expensesTable.workspaceId), eq(expensesTable.userId, userId))!
    : eq(expensesTable.workspaceId, workspaceId);
}

/** Join conditions that only attach a vendor/project from the expense's own scope. */
export const vendorJoin = and(
  eq(expensesTable.platformId, platformsTable.id),
  sql`((${expensesTable.workspaceId} IS NULL AND ${platformsTable.workspaceId} IS NULL AND ${expensesTable.userId} = ${platformsTable.userId}) OR ${expensesTable.workspaceId} = ${platformsTable.workspaceId})`,
)!;
export const projectJoin = and(
  eq(expensesTable.projectId, projectsTable.id),
  sql`((${expensesTable.workspaceId} IS NULL AND ${projectsTable.workspaceId} IS NULL AND ${expensesTable.userId} = ${projectsTable.userId}) OR ${expensesTable.workspaceId} = ${projectsTable.workspaceId})`,
)!;

export { comparisonPeriod, fromCents, isCalendarDate, monthPeriod, percentChange, shiftMonth, toCents } from "./spend-math";
export type { Comparison, Period } from "./spend-math";

// ---------- Expense filters shared by search and export ----------

export type ExpenseFilters = {
  q?: string;
  from?: string;
  to?: string;
  minAmount?: string;
  maxAmount?: string;
  platformId?: number | "none";
  projectId?: number | "none";
  category?: string;
  currency?: string;
  entryType?: "expense" | "credit";
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, char => `\\${char}`);
}

/** SQL conditions for the filters; amounts compare the signed recorded amount. */
export function filterConditions(f: ExpenseFilters): SQL[] {
  const conditions: SQL[] = [];
  if (f.from) conditions.push(gte(expensesTable.date, f.from));
  if (f.to) conditions.push(lte(expensesTable.date, f.to));
  if (f.minAmount !== undefined) conditions.push(sql`${expensesTable.amount} >= ${f.minAmount}::numeric`);
  if (f.maxAmount !== undefined) conditions.push(sql`${expensesTable.amount} <= ${f.maxAmount}::numeric`);
  if (f.platformId === "none") conditions.push(isNull(expensesTable.platformId));
  else if (f.platformId !== undefined) conditions.push(eq(expensesTable.platformId, f.platformId));
  if (f.projectId === "none") conditions.push(isNull(expensesTable.projectId));
  else if (f.projectId !== undefined) conditions.push(eq(expensesTable.projectId, f.projectId));
  // "" means uncategorised: NULL or an empty string, as the dashboard groups them.
  if (f.category !== undefined) {
    conditions.push(f.category === "" ? or(isNull(expensesTable.category), eq(expensesTable.category, ""))! : eq(expensesTable.category, f.category));
  }
  if (f.currency) conditions.push(eq(expensesTable.currency, f.currency));
  if (f.entryType === "expense") conditions.push(sql`${expensesTable.amount} >= 0`);
  if (f.entryType === "credit") conditions.push(sql`${expensesTable.amount} < 0`);
  if (f.q) {
    const pattern = `%${escapeLike(f.q)}%`;
    conditions.push(or(
      ilike(expensesTable.description, pattern),
      ilike(expensesTable.category, pattern),
      ilike(platformsTable.name, pattern),
      ilike(projectsTable.name, pattern),
    )!);
  }
  return conditions;
}
