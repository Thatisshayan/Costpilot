import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp, integer, numeric, boolean, check, index } from "drizzle-orm/pg-core";
import { platformsTable } from "./platforms";
import { projectsTable } from "./projects";
import { workspacesTable } from "./workspaces";

/**
 * A recurring plan (e.g. ChatGPT Plus, Claude Max). When `autoRecord` is on, each renewal that
 * passes is recorded as a `source = "subscription"` expense and `nextRenewalDate` moves on.
 * Several TypeScript names differ from their (older) column names, which are kept as-is.
 */
export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, { onDelete: "set null" }),
  /** Optional vendor; a plan does not need one. */
  platformId: integer("platform_id").references(() => platformsTable.id, { onDelete: "set null" }),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  /** Display name, e.g. "Claude Max". */
  name: text("plan_name").notNull(),
  /** weekly | monthly | quarterly | yearly */
  billingCycle: text("plan_type").notNull(),
  /** active | trial | paused | cancelled. Only active plans are recorded. */
  status: text("status").default("active").notNull(),
  email: text("email"),
  trialStartDate: text("trial_start_date"),
  trialEndDate: text("trial_end_date"),
  /** Next charge date, YYYY-MM-DD. */
  nextRenewalDate: text("renewal_date"),
  /** Day of month the plan bills on, so month-end renewals do not drift (31 -> Feb 28 -> Mar 31). */
  billingAnchorDay: integer("billing_anchor_day"),
  /** Price per billing cycle. */
  amount: numeric("monthly_cost", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD").notNull(),
  autoRecord: boolean("auto_record").default(true).notNull(),
  lastRecordedDate: text("last_recorded_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, table => [
  index("subscriptions_user_idx").on(table.userId),
  index("subscriptions_workspace_idx").on(table.workspaceId),
  check("subscriptions_cycle_known", sql`${table.billingCycle} IN ('weekly', 'monthly', 'quarterly', 'yearly')`),
  check("subscriptions_status_known", sql`${table.status} IN ('active', 'trial', 'paused', 'cancelled')`),
]);

export type InsertSubscription = typeof subscriptionsTable.$inferInsert;
export type Subscription = typeof subscriptionsTable.$inferSelect;
