import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const workspacesTable = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  slug: text("slug").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertWorkspace = typeof workspacesTable.$inferInsert;
export type Workspace = typeof workspacesTable.$inferSelect;
