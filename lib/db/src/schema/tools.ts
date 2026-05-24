import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { platformsTable } from "./platforms";
import { projectsTable } from "./projects";
import { workspacesTable } from "./workspaces";

export const toolsTable = pgTable("tools", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "set null" }),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  platformId: integer("platform_id").references(() => platformsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: text("category"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertToolSchema = createInsertSchema(toolsTable).omit({ id: true, createdAt: true });
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof toolsTable.$inferSelect;
