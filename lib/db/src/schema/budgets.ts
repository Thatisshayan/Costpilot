import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";
import { projectsTable } from "./projects";

export const budgetPoliciesTable = pgTable("budget_policies", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "set null" }),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  thresholdAmount: numeric("threshold_amount", { precision: 12, scale: 2 }).notNull(),
  action: text("action").notNull().default("warn"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertBudgetPolicy = typeof budgetPoliciesTable.$inferInsert;
export type BudgetPolicy = typeof budgetPoliciesTable.$inferSelect;
