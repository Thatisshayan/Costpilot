import { index, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { platformsTable } from "./platforms";

/**
 * Point-in-time readings of a cumulative provider counter (lifetime usage, remaining
 * balance or credits). Providers without a daily cost API are synced by differencing
 * consecutive readings.
 */
export const providerSnapshotsTable = pgTable("provider_snapshots", {
  id: serial("id").primaryKey(),
  platformId: integer("platform_id").notNull().references(() => platformsTable.id, { onDelete: "cascade" }),
  /** What was read, e.g. "lifetime_usage_usd" or "credits_remaining". */
  metric: text("metric").notNull(),
  value: numeric("value", { precision: 18, scale: 6 }).notNull(),
  takenAt: timestamp("taken_at").defaultNow().notNull(),
}, table => [
  index("provider_snapshots_platform_metric_idx").on(table.platformId, table.metric, table.takenAt),
]);

export type ProviderSnapshot = typeof providerSnapshotsTable.$inferSelect;
