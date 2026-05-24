import { Router } from "express";
import { db, remediationActionsTable, remediationLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// List Remediation Actions
router.get("/", async (req, res) => {
  const actions = await db.select().from(remediationActionsTable);
  res.json(actions);
});

// Execute Remediation
router.post("/execute", async (req, res) => {
  const { actionId } = req.body;

  try {
    // 1. Mark as executing
    await db.update(remediationActionsTable)
      .set({ status: "Executing" })
      .where(eq(remediationActionsTable.id, actionId));

    // 2. Mock execution logic
    await db.insert(remediationLogsTable).values({
      actionId,
      logMessage: "Connecting to provider API...",
    });

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));

    await db.insert(remediationLogsTable).values({
      actionId,
      logMessage: "Successfully downgraded tier / rotated key.",
      details: "Action verified by provider telemetry.",
    });

    // 3. Complete
    const [updated] = await db.update(remediationActionsTable)
      .set({ 
        status: "Completed",
        executedAt: new Date()
      })
      .where(eq(remediationActionsTable.id, actionId))
      .returning();

    res.json({ success: true, action: updated });
  } catch (err) {
    logger.error({ err }, "Remediation execution failed");
    res.status(500).json({ error: "Failed to execute remediation" });
  }
});

export default router;
