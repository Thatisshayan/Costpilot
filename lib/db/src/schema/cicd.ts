import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";
import { projectsTable } from "./projects";

export const deploymentPoliciesTable = pgTable("deployment_policies", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ruleType: text("rule_type").notNull(), // e.g., "budget_threshold", "usage_spike"
  threshold: text("threshold"), // e.g., "110%" or "50.00"
  action: text("action").default("warn").notNull(), // "warn" or "block"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pipelineRunsTable = pgTable("pipeline_runs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  pipelineName: text("pipeline_name").notNull(),
  repository: text("repository").notNull(),
  branch: text("branch").notNull(),
  status: text("status").notNull(), // "Healthy", "Blocked", "Warning"
  reason: text("reason"),
  triggeredBy: text("triggered_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
