import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

export const aiAuditsTable = pgTable("ai_audits", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  severity: text("severity").notNull(), // "Critical", "High", "Medium", "Low"
  status: text("status").default("Pending").notNull(), // "Pending", "Resolved", "Ignored"
  description: text("description").notNull(),
  remediationPath: text("remediation_path"), // link to remediation action if applicable
  findings: jsonb("findings"), // structured AI findings
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
