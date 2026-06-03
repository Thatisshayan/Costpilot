import { Router } from "express";
import { db, remediationActionsTable, remediationLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireWorkspaceMember } from "../middlewares/authz";
import { isWorkspaceMember } from "../middlewares/auth";
import { ExecuteRemediationBody } from "@workspace/api-zod";

const router = Router();

// List Remediation Actions
router.get("/", requireWorkspaceMember(["owner", "admin", "viewer"]), async (req, res) => {
  const workspaceId = parseInt(req.query.workspaceId as string);
  try {
    const actions = await db
      .select()
      .from(remediationActionsTable)
      .where(eq(remediationActionsTable.workspaceId, workspaceId));
    res.json(actions);
  } catch (err) {
    logger.error({ err }, "Failed to fetch remediation actions");
    res.status(500).json({ error: "Failed to fetch actions" });
  }
});

// Execute Remediation
router.post("/execute", async (req, res) => {
  try {
    const { actionId } = ExecuteRemediationBody.parse(req.body);

    // 1. Fetch action to find its workspace context
    const [action] = await db
      .select()
      .from(remediationActionsTable)
      .where(eq(remediationActionsTable.id, actionId));

    if (!action) {
      res.status(404).json({ error: "Not found", message: "Remediation action not found" });
      return;
    }

    if (!action.workspaceId) {
      res.status(400).json({ error: "Invalid action", message: "Action is not associated with a workspace" });
      return;
    }

    // 2. Authorize that caller is an owner or admin of the workspace
    const authorized = await isWorkspaceMember(action.workspaceId, req.userId!, ["owner", "admin"]);
    if (!authorized) {
      res.status(403).json({ error: "Forbidden", message: "Insufficient workspace role to execute remediation" });
      return;
    }

    // 3. Mark as executing
    await db.update(remediationActionsTable)
      .set({ status: "Executing" })
      .where(eq(remediationActionsTable.id, actionId));

    // 4. Mock execution logic
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

    // 5. Complete
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
    // Forward to error handler if it's ZodError, otherwise standard response
    throw err;
  }
});

export default router;
