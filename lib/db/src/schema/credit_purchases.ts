import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { platformsTable } from "./platforms";
import { projectsTable } from "./projects";

export const creditPurchasesTable = pgTable("credit_purchases", {
  id: serial("id").primaryKey(),
  platformId: integer("platform_id").notNull().references(() => platformsTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  credits: numeric("credits", { precision: 14, scale: 4 }),
  currency: text("currency").default("USD").notNull(),
  description: text("description"),
  purchaseDate: text("purchase_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCreditPurchaseSchema = createInsertSchema(creditPurchasesTable).omit({ id: true, createdAt: true });
export type InsertCreditPurchase = z.infer<typeof insertCreditPurchaseSchema>;
export type CreditPurchase = typeof creditPurchasesTable.$inferSelect;
