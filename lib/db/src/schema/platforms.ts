import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { workspacesTable } from "./workspaces";

export const platformsTable = pgTable("platforms", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  website: text("website"),
  logoUrl: text("logo_url"),
  category: text("category"),
  email: text("email"),
  apiKey: text("api_key"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertPlatform = typeof platformsTable.$inferInsert;
export type Platform = typeof platformsTable.$inferSelect;
