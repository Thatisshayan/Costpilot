import cron from "node-cron";
import { db, platformsTable, subscriptionsTable, expensesTable, aiAuditsTable } from "@workspace/db";
import { isNotNull, eq, and, lte } from "drizzle-orm";
import { syncPlatform } from "./sync-engine";
import { logger } from "./logger";
import { sendNotification } from "../services/notifications";

/**
 * Runs a mathematical standard deviation and spike scan on all expenses
 * grouped by workspace to flag anomalies in the audits table context.
 */
export async function runAnomalyDetection(): Promise<number> {
  logger.info("Starting database expense anomaly detection scan...");
  let anomaliesFound = 0;

  try {
    const allExpenses = await db.select().from(expensesTable);
    if (allExpenses.length === 0) {
      logger.info("No expense records found to analyze.");
      return 0;
    }

    // Group expenses by workspace
    const workspaceGroups: Record<number, typeof allExpenses> = {};
    for (const exp of allExpenses) {
      if (exp.workspaceId !== null) {
        if (!workspaceGroups[exp.workspaceId]) {
          workspaceGroups[exp.workspaceId] = [];
        }
        workspaceGroups[exp.workspaceId].push(exp);
      }
    }

    for (const [workspaceIdStr, expenses] of Object.entries(workspaceGroups)) {
      const workspaceId = parseInt(workspaceIdStr, 10);
      if (expenses.length < 2) continue; // Variance/stdDev requires at least 2 records

      const amounts = expenses.map(e => parseFloat(e.amount));
      const count = amounts.length;
      const sum = amounts.reduce((a, b) => a + b, 0);
      const mean = sum / count;

      // Calculate Standard Deviation
      const variance = amounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
      const stdDev = Math.sqrt(variance);

      // Baseline threshold is mean + 2.5x standard deviations
      const threshold = mean + 2.5 * stdDev;

      for (const exp of expenses) {
        const amt = parseFloat(exp.amount);
        let isAnomaly = false;
        let reason = "";

        if (stdDev > 1.0 && amt > threshold) {
          isAnomaly = true;
          reason = `Cost of $${amt.toFixed(2)} exceeds standard baseline threshold of $${threshold.toFixed(2)} (mean: $${mean.toFixed(2)}, stdDev: $${stdDev.toFixed(2)})`;
        } else if (mean > 0 && amt > mean * 3 && amt > 50) {
          isAnomaly = true;
          reason = `Sudden cost spike: $${amt.toFixed(2)} is over 3x the average cost of $${mean.toFixed(2)}`;
        }

        if (isAnomaly) {
          // Check if this expense has already been flagged to avoid redundant records
          const existingAudits = await db
            .select()
            .from(aiAuditsTable)
            .where(eq(aiAuditsTable.workspaceId, workspaceId));

          const alreadyFlagged = existingAudits.some(audit => {
            const findings = audit.findings as any;
            return findings && findings.expenseId === exp.id;
          });

          if (!alreadyFlagged) {
            let platformName = "Cloud Platform";
            if (exp.platformId) {
              const platform = await db.query.platformsTable.findFirst({
                where: (p, { eq }) => eq(p.id, exp.platformId!)
              });
              if (platform) platformName = platform.name;
            }

            // Write to audits table context
            await db.insert(aiAuditsTable).values({
              workspaceId,
              title: `Cost Anomaly: ${platformName}`,
              severity: amt > mean * 5 ? "Critical" : "High",
              status: "Pending",
              description: `Automated scan flagged expense on ${exp.date} for $${amt.toFixed(2)}: ${reason}`,
              remediationPath: `/expenses?id=${exp.id}`,
              findings: {
                expenseId: exp.id,
                amount: exp.amount,
                mean: mean.toFixed(2),
                stdDev: stdDev.toFixed(2),
                threshold: threshold.toFixed(2),
                platformName,
                category: exp.category,
                date: exp.date,
                reason
              }
            });

            logger.warn(`Anomaly logged to audits table: Expense ID ${exp.id}, Amount $${exp.amount} for ${platformName}`);
            anomaliesFound++;
          }
        }
      }
    }

    logger.info(`Anomaly detection scan complete. Logged ${anomaliesFound} new anomalies.`);
    return anomaliesFound;
  } catch (err) {
    logger.error(err, "Critical error during runAnomalyDetection");
    throw err;
  }
}

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

  // 3. Daily Anomaly Scan at 04:00 AM
  cron.schedule("0 4 * * *", async () => {
    logger.info("Starting automated anomaly detection cron job...");
    try {
      await runAnomalyDetection();
    } catch (err) {
      logger.error(err, "Error during anomaly detection cron job");
    }
  });

  logger.info("Background Cron Jobs initialized (Sync at 03:00, Alerts at 09:00, Anomalies at 04:00)");
}
