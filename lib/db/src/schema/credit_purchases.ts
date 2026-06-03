import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { platformsTable } from "./platforms";
import { projectsTable } from "./projects";
import { workspacesTable } from "./workspaces";

export const creditPurchasesTable = pgTable("credit_purchases", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "set null" }),
  platformId: integer("platform_id").notNull().references(() => platformsTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  credits: numeric("credits", { precision: 14, scale: 4 }),
  currency: text("currency").default("USD").notNull(),
  description: text("description"),
  purchaseDate: text("purchase_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertCreditPurchase = typeof creditPurchasesTable.$inferInsert;
export type CreditPurchase = typeof creditPurchasesTable.$inferSelect;
