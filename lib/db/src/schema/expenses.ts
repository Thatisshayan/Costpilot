import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp, integer, numeric, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { importBatchesTable } from "./import_batches";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { platformsTable } from "./platforms";
import { projectsTable } from "./projects";
import { workspacesTable } from "./workspaces";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "set null" }),
  platformId: integer("platform_id").references(() => platformsTable.id, { onDelete: "set null" }),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  description: text("description"),
  category: text("category"),
  date: text("date").notNull(),
  tags: text("tags"),
  /** Provenance: "manual" (entered in the app) or "import" (CSV). No provider sync writes here. */
  source: text("source").default("manual").notNull(),
  /** The source's own transaction id, when the file has one; unique per scope and source. */
  externalId: text("external_id"),
  importBatchId: integer("import_batch_id").references(() => importBatchesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [
  index("expenses_user_date_idx").on(table.userId, table.date),
  index("expenses_workspace_date_idx").on(table.workspaceId, table.date),
  index("expenses_import_batch_idx").on(table.importBatchId),
  check("expenses_source_known", sql`${table.source} IN ('manual', 'import')`),
  // NULL workspace ids are distinct in a unique index, so Personal rows need their own index.
  uniqueIndex("expenses_workspace_external_unique").on(table.workspaceId, table.source, table.externalId)
    .where(sql`${table.workspaceId} IS NOT NULL AND ${table.externalId} IS NOT NULL`),
  uniqueIndex("expenses_personal_external_unique").on(table.userId, table.source, table.externalId)
    .where(sql`${table.workspaceId} IS NULL AND ${table.externalId} IS NOT NULL`),
]);

export type InsertExpense = typeof expensesTable.$inferInsert;
export type Expense = typeof expensesTable.$inferSelect;
