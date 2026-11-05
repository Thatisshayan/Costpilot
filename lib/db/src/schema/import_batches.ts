import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

/** One CSV import (Batch 3). Expenses it created point back here so the batch can be undone. */
export const importBatchesTable = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  rowCount: integer("row_count").notNull(),
  insertedCount: integer("inserted_count").notNull(),
  skippedCount: integer("skipped_count").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  undoneAt: timestamp("undone_at"),
}, table => [
  index("import_batches_workspace_idx").on(table.workspaceId, table.createdAt),
  index("import_batches_user_idx").on(table.userId, table.createdAt),
]);

export type ImportBatch = typeof importBatchesTable.$inferSelect;
