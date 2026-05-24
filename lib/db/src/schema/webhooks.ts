import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

export const webhooksTable = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  type: text("type", { enum: ["slack", "discord"] }).notNull(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  events: text("events").default("expiring_trials,large_expenses").notNull(), // comma separated
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
