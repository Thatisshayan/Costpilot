import cron from "node-cron";
import { db, platformsTable, subscriptionsTable } from "@workspace/db";
import { isNotNull, eq, and, lte, sql } from "drizzle-orm";
import { syncPlatform } from "./sync-engine";
import { logger } from "./logger";
import { sendNotification } from "../services/notifications";

export function initCronJobs() {
  // 1. Daily Sync at 03:00 AM
  cron.schedule("0 3 * * *", async () => {
    logger.info("Starting automated daily sync for all platforms...");
    
    try {
      const activePlatforms = await db
        .select({ id: platformsTable.id, userId: platformsTable.userId, name: platformsTable.name })
        .from(platformsTable)
        .where(isNotNull(platformsTable.apiKey));

      for (const platform of activePlatforms) {
        await syncPlatform(platform.id, platform.userId);
      }
      logger.info("Automated daily sync completed.");
    } catch (err) {
      logger.error(err, "Critical error during daily sync cron job");
    }
  });

  // 2. Daily Notification Check at 09:00 AM
  cron.schedule("0 9 * * *", async () => {
    logger.info("Starting automated notification check...");
    
    try {
      const today = new Date().toISOString().slice(0, 10);
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Find trials expiring in the next 3 days
      const expiringTrials = await db
        .select({
          id: subscriptionsTable.id,
          platformName: platformsTable.name,
          planName: subscriptionsTable.planName,
          expiryDate: subscriptionsTable.trialEndDate,
          workspaceId: subscriptionsTable.workspaceId,
          userId: subscriptionsTable.userId
        })
        .from(subscriptionsTable)
        .leftJoin(platformsTable, eq(subscriptionsTable.platformId, platformsTable.id))
        .where(
          and(
            eq(subscriptionsTable.status, "active"),
            isNotNull(subscriptionsTable.trialEndDate),
            lte(subscriptionsTable.trialEndDate, threeDaysFromNow)
          )
        );

      for (const trial of expiringTrials) {
        if (trial.workspaceId) {
          const message = `🔔 *Trial Expiry Alert*\nThe ${trial.planName} trial for *${trial.platformName}* expires on *${trial.expiryDate}*.\nManage it here: https://ai-expense-tracker.app/subscriptions`;
          await sendNotification(trial.workspaceId, "expiring_trials", message);
        }
      }
    } catch (err) {
      logger.error(err, "Error during notification cron job");
    }
  });

  logger.info("Background Cron Jobs initialized (Sync at 03:00, Alerts at 09:00)");
}
