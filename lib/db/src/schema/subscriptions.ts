import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { platformsTable } from "./platforms";
import { projectsTable } from "./projects";
import { workspacesTable } from "./workspaces";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "set null" }),
  platformId: integer("platform_id").notNull().references(() => platformsTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  planName: text("plan_name").notNull(),
  planType: text("plan_type").notNull(),
  status: text("status").default("active").notNull(),
  email: text("email"),
  trialStartDate: text("trial_start_date"),
  trialEndDate: text("trial_end_date"),
  renewalDate: text("renewal_date"),
  monthlyCost: numeric("monthly_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
