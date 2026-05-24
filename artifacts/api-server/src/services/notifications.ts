import { db, webhooksTable, expensesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function sendNotification(workspaceId: number, event: string, message: string) {
  const webhooks = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.workspaceId, workspaceId), eq(webhooksTable.isActive, true)));

  logger.info(`Sending ${event} notification to ${webhooks.length} webhooks for workspace ${workspaceId}`);

  for (const webhook of webhooks) {
    if (webhook.events.includes(event)) {
      try {
        // Handle Slack vs Discord vs Generic
        let body = {};
        if (webhook.type === "slack") body = { text: message };
        else if (webhook.type === "discord") body = { content: message };
        else body = { event, message, timestamp: new Date().toISOString() };

        await fetch(webhook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (err) {
        logger.error({ err }, `Failed to send ${webhook.type} notification`);
      }
    }
  }
}

export async function checkBudgetThresholds(workspaceId: number, budget: number) {
  const [totalSpendRow] = await db
    .select({ total: sql<string>`SUM(${expensesTable.amount})` })
    .from(expensesTable)
    .where(eq(expensesTable.workspaceId, workspaceId));

  const totalSpend = Number(totalSpendRow?.total || 0);
  const percentUsed = (totalSpend / budget) * 100;

  logger.info(`Checking budget for workspace ${workspaceId}: ${percentUsed.toFixed(2)}% used`);

  if (percentUsed >= 100) {
    await sendNotification(
      workspaceId, 
      "budget_exceeded", 
      `🚨 CRITICAL: Budget Exceeded. Total spend $${totalSpend.toLocaleString()} is ${percentUsed.toFixed(0)}% of your $${budget.toLocaleString()} limit.`
    );
  } else if (percentUsed >= 80) {
    await sendNotification(
      workspaceId, 
      "budget_warning", 
      `⚠️ WARNING: Budget Alert. You have used ${percentUsed.toFixed(0)}% ($${totalSpend.toLocaleString()}) of your $${budget.toLocaleString()} monthly budget.`
    );
  }
}
