// In-process sync schedule for a single API instance (local/personal use). Every
// SYNC_INTERVAL_HOURS it syncs each connected platform whose last attempt is older than the
// interval; it also runs shortly after startup so a machine that was off catches up.
// SYNC_INTERVAL_HOURS=0 disables it. Multi-instance hosting would need a distributed lock.
import { db, platformsTable } from "@workspace/db";
import { and, isNotNull } from "drizzle-orm";
import { logger } from "../logger";
import { syncPlatform } from "./engine";
import { providerAdapters } from "./registry";

const STARTUP_DELAY_MS = 30_000;
const CHECK_EVERY_MS = 15 * 60_000;

export function startSyncScheduler(intervalHours: number): () => void {
  if (intervalHours <= 0) {
    logger.info("provider sync scheduler disabled (SYNC_INTERVAL_HOURS=0)");
    return () => {};
  }
  const intervalMs = intervalHours * 3_600_000;
  // Last scheduled attempt per platform, so a failing provider retries once per interval.
  const lastAttempt = new Map<number, number>();
  let busy = false;

  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const connected = await db.select().from(platformsTable)
        .where(and(isNotNull(platformsTable.provider), isNotNull(platformsTable.apiKey)));
      const now = Date.now();
      for (const platform of connected) {
        const adapter = providerAdapters.get(platform.provider!);
        if (!adapter) continue;
        const platformIntervalMs = Math.max(intervalMs, (adapter.minIntervalHours ?? 0) * 3_600_000);
        const lastOk = platform.lastSyncStatus === "ok" ? platform.lastSyncedAt?.getTime() : undefined;
        const last = Math.max(lastOk ?? 0, lastAttempt.get(platform.id) ?? 0);
        if (now - last < platformIntervalMs) continue;
        lastAttempt.set(platform.id, now);
        await syncPlatform(platform).catch(err => logger.warn({ platformId: platform.id, err: err.message }, "scheduled provider sync failed"));
      }
    } catch (err) {
      logger.error({ err }, "provider sync scheduler tick failed");
    } finally {
      busy = false;
    }
  };

  const startup = setTimeout(tick, STARTUP_DELAY_MS);
  const timer = setInterval(tick, CHECK_EVERY_MS);
  startup.unref();
  timer.unref();
  logger.info({ intervalHours }, "provider sync scheduler started");
  return () => { clearTimeout(startup); clearInterval(timer); };
}
