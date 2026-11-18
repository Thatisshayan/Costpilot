// Provider sync engine: fetch daily cost lines from a platform's adapter and reconcile them
// with that platform's `source = "sync"` expenses inside the sync window.
//   - new line            -> insert
//   - changed amount      -> update in place (providers revise recent days)
//   - line gone from the provider's figures for a day in the window -> delete
// Counter adapters (no cost history) instead store a reading each sync and add the spend since
// the previous reading to today's row.
// Manual and CSV-imported expenses are never read or written here.
import { db, expensesTable, platformsTable, providerSnapshotsTable, type Platform } from "@workspace/db";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { decrypt } from "../kms-vault";
import { logger } from "../logger";
import { resourceScope } from "../resource-scope";
import { isoDay } from "./http";
import { providerAdapters } from "./registry";
import { ProviderError, type CounterReading, type DailyCost, type SyncWindow } from "./types";

const DAY_MS = 86_400_000;
/** First sync backfills this many days. */
export const BACKFILL_DAYS = 90;
/** Later syncs re-pull this many days so provider revisions are picked up. */
export const RESYNC_DAYS = 40;

export interface SyncResult {
  inserted: number;
  updated: number;
  removed: number;
  /** Sum of synced amounts in the window, per currency. */
  totals: Record<string, string>;
  window: { from: string; to: string };
}

const running = new Set<number>();

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function syncWindow(platform: Pick<Platform, "lastSyncedAt">, now: Date): SyncWindow {
  const days = platform.lastSyncedAt ? RESYNC_DAYS : BACKFILL_DAYS;
  const today = startOfUtcDay(now);
  return { from: new Date(today.getTime() - days * DAY_MS), to: new Date(today.getTime() + DAY_MS) };
}

/** Sums lines sharing a day and key, and rounds to cents. */
export function consolidate(costs: DailyCost[]): DailyCost[] {
  const merged = new Map<string, DailyCost>();
  for (const cost of costs) {
    const id = `${cost.date}|${cost.key}|${cost.currency}`;
    const prior = merged.get(id);
    merged.set(id, prior ? { ...prior, amount: prior.amount + cost.amount } : { ...cost });
  }
  return [...merged.values()].map(c => ({ ...c, amount: Math.round(c.amount * 100) / 100 }));
}

export const syncExternalId = (provider: string, platformId: number, cost: Pick<DailyCost, "date" | "key" | "currency">) =>
  `${provider}:${platformId}:${cost.date}:${cost.key}:${cost.currency}`;

/**
 * Spend between two counter readings. A spend counter that drops was reset (new billing
 * period), so everything on it is new spend; a balance that rises was topped up, which is not
 * spend. The first reading is only a baseline.
 */
export function counterDelta(previous: number | null, next: number, kind: CounterReading["kind"]): number {
  if (previous === null) return 0;
  if (kind === "spend") return next >= previous ? next - previous : next;
  return previous > next ? previous - next : 0;
}

/** Adapters with several secret fields store them as one encrypted JSON object. */
function readSecret(platform: Platform): string {
  if (!platform.apiKey) throw new ProviderError("No credential is stored for this platform.");
  return decrypt(platform.apiKey);
}

/** Loads a platform the caller may write, or returns null. */
export async function loadWritablePlatform(platformId: number, userId: string) {
  const [platform] = await db.select().from(platformsTable)
    .where(and(eq(platformsTable.id, platformId), resourceScope(platformsTable, userId, true)));
  return platform ?? null;
}

export async function syncPlatform(platform: Platform, options: { now?: Date; fetchImpl?: typeof fetch } = {}): Promise<SyncResult> {
  const adapter = platform.provider ? providerAdapters.get(platform.provider) : undefined;
  if (!adapter) throw new ProviderError("This platform is not connected to a supported provider.");
  if (running.has(platform.id)) throw new ProviderError("A sync for this platform is already running.");
  running.add(platform.id);
  const now = options.now ?? new Date();
  const window = syncWindow(platform, now);
  try {
    const secret = readSecret(platform);
    const context = { secret, config: platform.providerConfig ?? {}, fetch: options.fetchImpl ?? fetch };
    let result: SyncResult;
    if (adapter.mode === "counter") {
      result = await bookCounter(platform, adapter.id, await adapter.readCounter(context), now);
    } else {
      const raw = await adapter.fetchDailyCosts({ ...context, window });
      const fromDay = isoDay(window.from);
      const toDay = isoDay(window.to);
      const costs = consolidate(raw).filter(c => c.date >= fromDay && c.date < toDay);
      result = await reconcile(platform, adapter.id, costs, fromDay, toDay);
    }
    await db.update(platformsTable)
      .set({ lastSyncedAt: now, lastSyncStatus: "ok", lastSyncError: null })
      .where(eq(platformsTable.id, platform.id));
    logger.info({ platformId: platform.id, provider: adapter.id, ...result }, "provider sync completed");
    return result;
  } catch (err) {
    const message = err instanceof ProviderError ? err.message : "Sync failed unexpectedly; see the API log.";
    if (!(err instanceof ProviderError)) logger.error({ err, platformId: platform.id }, "provider sync failed");
    await db.update(platformsTable)
      .set({ lastSyncStatus: "error", lastSyncError: message })
      .where(eq(platformsTable.id, platform.id));
    throw err instanceof ProviderError ? err : new ProviderError(message);
  } finally {
    running.delete(platform.id);
  }
}

async function reconcile(platform: Platform, provider: string, costs: DailyCost[], fromDay: string, toDay: string): Promise<SyncResult> {
  return db.transaction(async tx => {
    const existing = await tx.select({ id: expensesTable.id, externalId: expensesTable.externalId, amount: expensesTable.amount })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.platformId, platform.id), eq(expensesTable.source, "sync"),
        gte(expensesTable.date, fromDay), lt(expensesTable.date, toDay),
      ));
    const byExternalId = new Map(existing.map(e => [e.externalId, e]));
    const seen = new Set<string>();
    const totals: Record<string, number> = {};
    let inserted = 0;
    let updated = 0;

    for (const cost of costs) {
      const externalId = syncExternalId(provider, platform.id, cost);
      const amount = cost.amount.toFixed(2);
      const prior = byExternalId.get(externalId);
      if (amount === "0.00" || amount === "-0.00") continue;
      seen.add(externalId);
      totals[cost.currency] = (totals[cost.currency] ?? 0) + cost.amount;
      if (prior) {
        if (Number(prior.amount).toFixed(2) !== amount) {
          await tx.update(expensesTable).set({ amount, description: cost.description }).where(eq(expensesTable.id, prior.id));
          updated++;
        }
        continue;
      }
      await tx.insert(expensesTable).values({
        userId: platform.userId, workspaceId: platform.workspaceId, platformId: platform.id,
        amount, currency: cost.currency, description: cost.description, category: "API usage",
        date: cost.date, source: "sync", externalId,
      });
      inserted++;
    }

    let removed = 0;
    for (const row of existing) {
      if (row.externalId && !seen.has(row.externalId)) {
        await tx.delete(expensesTable).where(eq(expensesTable.id, row.id));
        removed++;
      }
    }

    return {
      inserted, updated, removed,
      totals: Object.fromEntries(Object.entries(totals).map(([c, v]) => [c, v.toFixed(2)])),
      window: { from: fromDay, to: toDay },
    };
  });
}

async function bookCounter(platform: Platform, provider: string, reading: CounterReading, now: Date): Promise<SyncResult> {
  return db.transaction(async tx => {
    const [previous] = await tx.select({ value: providerSnapshotsTable.value }).from(providerSnapshotsTable)
      .where(and(eq(providerSnapshotsTable.platformId, platform.id), eq(providerSnapshotsTable.metric, reading.metric)))
      .orderBy(desc(providerSnapshotsTable.takenAt), desc(providerSnapshotsTable.id))
      .limit(1);
    await tx.insert(providerSnapshotsTable).values({ platformId: platform.id, metric: reading.metric, value: String(reading.value), takenAt: now });

    const today = isoDay(now);
    const window = { from: today, to: isoDay(new Date(startOfUtcDay(now).getTime() + DAY_MS)) };
    const delta = Math.round(counterDelta(previous ? Number(previous.value) : null, reading.value, reading.kind) * 100) / 100;
    if (delta <= 0) return { inserted: 0, updated: 0, removed: 0, totals: {}, window };

    const externalId = syncExternalId(provider, platform.id, { date: today, key: "usage", currency: reading.currency });
    const [row] = await tx.select({ id: expensesTable.id, amount: expensesTable.amount }).from(expensesTable)
      .where(and(eq(expensesTable.platformId, platform.id), eq(expensesTable.source, "sync"), eq(expensesTable.externalId, externalId)));
    const totals = { [reading.currency]: delta.toFixed(2) };
    if (row) {
      await tx.update(expensesTable).set({ amount: (Number(row.amount) + delta).toFixed(2) }).where(eq(expensesTable.id, row.id));
      return { inserted: 0, updated: 1, removed: 0, totals, window };
    }
    await tx.insert(expensesTable).values({
      userId: platform.userId, workspaceId: platform.workspaceId, platformId: platform.id,
      amount: delta.toFixed(2), currency: reading.currency, description: reading.description, category: "API usage",
      date: today, source: "sync", externalId,
    });
    return { inserted: 1, updated: 0, removed: 0, totals, window };
  });
}
