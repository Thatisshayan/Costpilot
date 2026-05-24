import { db, expensesTable, platformsTable, subscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function processStripeWebhook(event: any) {
  const { type, data } = event;
  
  logger.info(`Processing Stripe event: ${type}`);

  if (type === 'invoice.payment_succeeded') {
    const invoice = data.object;
    const amount = (invoice.amount_paid / 100).toFixed(2);
    const customerEmail = invoice.customer_email;
    
    // Attempt to map to a vendor based on line items or description
    const description = invoice.lines?.data[0]?.description || "AI Service";
    
    // Use metadata from the invoice to identify the correct workspace and user
    const workspaceId = invoice.metadata?.workspaceId ? parseInt(invoice.metadata.workspaceId) : 1;
    const userId = invoice.metadata?.userId || "default_user";

    try {
      const [newExpense] = await db.insert(expensesTable).values({
        userId,
        workspaceId,
        amount,
        vendor: description.split(' ')[0], // Simple heuristic
        category: "Subscription",
        date: new Date().toISOString(),
        description: `Stripe Auto-Import: ${description}`,
        status: "Processed"
      }).returning();

      logger.info(`Successfully imported Stripe expense: ${newExpense.id}`);
      return { success: true, expenseId: newExpense.id };
    } catch (err) {
      logger.error({ err }, "Failed to insert Stripe expense");
      throw err;
    }
  }

  return { success: true, handled: false };
}

export async function processProviderUsage(provider: string, usageData: any) {
  logger.info(`Processing usage telemetry from ${provider}`);
  
  const { amount, workspaceId = 1, metadata } = usageData;
  
  // Real-time Intelligence Logic
  const isSpike = amount > 100; // Example threshold
  
  try {
    const [newExpense] = await db.insert(expensesTable).values({
      workspaceId,
      amount: amount.toString(),
      vendor: provider.charAt(0).toUpperCase() + provider.slice(1),
      category: "API Usage",
      date: new Date().toISOString(),
      description: `Real-time Usage Log: ${metadata || 'No details'}`,
      status: "Active"
    }).returning();

    return { 
      success: true, 
      expenseId: newExpense.id,
      intelligence: isSpike ? "Spike Detected" : "Normal"
    };
  } catch (err) {
    logger.error({ err }, `Failed to process ${provider} usage`);
    throw err;
  }
}
