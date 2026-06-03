import { Router } from "express";
import { db, aiAuditsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireWorkspaceMember } from "../middlewares/authz";

const router = Router();

// Get All Audits
router.get("/", requireWorkspaceMember(["owner", "admin", "viewer"]), async (req, res) => {
  const workspaceId = parseInt(req.query.workspaceId as string);
  try {
    const audits = await db
      .select()
      .from(aiAuditsTable)
      .where(eq(aiAuditsTable.workspaceId, workspaceId));
    res.json(audits);
  } catch (err) {
    logger.error({ err }, "Failed to fetch audits");
    res.status(500).json({ error: "Audit service offline" });
  }
});

// Run a new scan (Mock)
router.post("/scan", requireWorkspaceMember(["owner", "admin"]), async (req, res) => {
  const workspaceId = parseInt(req.body.workspaceId as string);
  try {
    const [newAudit] = await db.insert(aiAuditsTable).values({
      workspaceId,
      title: "Shadow AI Usage Detected",
      severity: "High",
      status: "Pending",
      description: "Non-standard API keys detected in use by the 'Dev-Test' environment. Potential for unmonitored spend exceeding $1,200/mo.",
      findings: {
        environment: "dev-test",
        estimated_risk: "$1,200/mo",
        detected_keys: ["sk-shadow-..."]
      }
    }).returning();

    res.json(newAudit);
  } catch (err) {
    logger.error({ err }, "Audit scan failed");
    res.status(500).json({ error: "Scan protocol failed" });
  }
});

export default router;
