import { db, expensesTable, platformsTable, subscriptionsTable, workspaceMembersTable } from "@workspace/db";
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
      const vendorName = description.split(' ')[0];
      const [newExpense] = await db.insert(expensesTable).values({
        userId,
        workspaceId,
        amount,
        category: "Subscription",
        date: new Date().toISOString(),
        description: `Stripe Auto-Import: ${description} (Vendor: ${vendorName}, Status: Processed)`,
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
  
  // Resolve userId for workspace
  let userId = "default_user";
  try {
    const member = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.role, "owner")))
      .limit(1)
      .then(rows => rows[0]);
    if (member) {
      userId = member.userId;
    } else {
      const anyMember = await db.select().from(workspaceMembersTable)
        .where(eq(workspaceMembersTable.workspaceId, workspaceId))
        .limit(1)
        .then(rows => rows[0]);
      if (anyMember) {
        userId = anyMember.userId;
      }
    }
  } catch (err) {
    logger.warn({ err }, `Could not resolve owner userId for workspace ${workspaceId}, using default_user`);
  }

  try {
    const vendorName = provider.charAt(0).toUpperCase() + provider.slice(1);
    const [newExpense] = await db.insert(expensesTable).values({
      userId,
      workspaceId,
      amount: amount.toString(),
      category: "API Usage",
      date: new Date().toISOString(),
      description: `Real-time Usage Log: ${metadata || 'No details'} (Vendor: ${vendorName}, Status: Active)`,
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
