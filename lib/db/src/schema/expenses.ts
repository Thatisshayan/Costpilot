import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertExpense = typeof expensesTable.$inferInsert;
export type Expense = typeof expensesTable.$inferSelect;
