import { sql } from "drizzle-orm";
import { check, index, integer, numeric, pgTable, serial, smallint, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { workspacesTable } from "./workspaces";

/**
 * Monthly spend budgets (Batch 3). One amount in one currency for a scope: Personal
 * (workspace_id NULL, owned by user_id) or a workspace, optionally narrowed to a project.
 * Spend in other currencies never counts towards a budget. The legacy `budget_policies`
 * table is unrelated and left untouched.
 */
export const spendBudgetsTable = pgTable("budgets", {
  id: serial("id").primaryKey(),
  /** Creator; for Personal budgets also the only reader and writer. */
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }),
  /** Deleting the project deletes its budget rather than silently widening it to the workspace. */
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  period: text("period", { enum: ["monthly"] }).default("monthly").notNull(),
  currency: text("currency").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  /** Alert thresholds as percentages of the amount, strictly ascending, each 1–100. */
  thresholds: smallint("thresholds").array().default(sql`'{50,80,100}'::smallint[]`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, table => [
  check("budgets_amount_positive", sql`${table.amount} > 0`),
  check("budgets_currency_iso", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  check("budgets_period_monthly", sql`${table.period} = 'monthly'`),
  check("budgets_name_length", sql`char_length(${table.name}) BETWEEN 1 AND 80`),
  check("budgets_thresholds_count", sql`cardinality(${table.thresholds}) BETWEEN 1 AND 5`),
  // One budget per scope, project (or none) and currency.
  uniqueIndex("budgets_workspace_unique").on(table.workspaceId, sql`coalesce(${table.projectId}, 0)`, table.currency)
    .where(sql`${table.workspaceId} IS NOT NULL`),
  uniqueIndex("budgets_personal_unique").on(table.userId, sql`coalesce(${table.projectId}, 0)`, table.currency)
    .where(sql`${table.workspaceId} IS NULL`),
  index("budgets_project_idx").on(table.projectId),
]);

export type SpendBudget = typeof spendBudgetsTable.$inferSelect;
export type InsertSpendBudget = typeof spendBudgetsTable.$inferInsert;
