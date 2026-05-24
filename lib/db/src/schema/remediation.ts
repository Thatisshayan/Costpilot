import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

export const remediationActionsTable = pgTable("remediation_actions", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  impact: text("impact").notNull(), // "High", "Medium", "Low"
  savingsPotential: text("savings_potential"),
  status: text("status").default("Pending").notNull(), // "Pending", "Executing", "Completed", "Failed"
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const remediationLogsTable = pgTable("remediation_logs", {
  id: serial("id").primaryKey(),
  actionId: integer("action_id").references(() => remediationActionsTable.id, { onDelete: "cascade" }),
  logMessage: text("log_message").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
