import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
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
  /** Provider-sync adapter id (e.g. "anthropic"); null for manual-only platforms. */
  provider: text("provider"),
  /** Non-secret adapter settings (team id, project id, region). Secrets stay in the encrypted apiKey. */
  providerConfig: jsonb("provider_config").$type<Record<string, string>>(),
  lastSyncedAt: timestamp("last_synced_at"),
  /** "ok" or "error" for the most recent sync attempt. */
  lastSyncStatus: text("last_sync_status"),
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertPlatform = typeof platformsTable.$inferInsert;
export type Platform = typeof platformsTable.$inferSelect;
