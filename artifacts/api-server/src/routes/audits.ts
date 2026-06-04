import { Router } from "express";
import { db, aiAuditsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireWorkspaceMember } from "../middlewares/authz";
import { auditEmitter } from "../lib/audit-emitter";

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

// SSE endpoint to stream real-time audits matching the requested workspaceId
router.get("/sse", requireWorkspaceMember(["owner", "admin", "viewer"]), (req, res) => {
  const workspaceId = parseInt(req.query.workspaceId as string);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Keep-alive/connection establishing comment
  res.write(": ok\n\n");

  const onAuditCreated = (audit: any) => {
    if (audit.workspaceId === workspaceId) {
      res.write(`data: ${JSON.stringify(audit)}\n\n`);
    }
  };

  auditEmitter.on("audit-created", onAuditCreated);

  const heartbeatInterval = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeatInterval);
    auditEmitter.off("audit-created", onAuditCreated);
    res.end();
  });
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

    if (newAudit) {
      auditEmitter.emit("audit-created", newAudit);
    }

    res.json(newAudit);
  } catch (err) {
    logger.error({ err }, "Audit scan failed");
    res.status(500).json({ error: "Scan protocol failed" });
  }
});

export default router;
