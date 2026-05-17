import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const platformsTable = pgTable("platforms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  logoUrl: text("logo_url"),
  category: text("category"),
  email: text("email"),
  apiKey: text("api_key"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlatformSchema = createInsertSchema(platformsTable).omit({ id: true, createdAt: true });
export type InsertPlatform = z.infer<typeof insertPlatformSchema>;
export type Platform = typeof platformsTable.$inferSelect;
