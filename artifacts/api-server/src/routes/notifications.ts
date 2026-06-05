import { Router } from "express";
import { db, webhooksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { requireWorkspaceMember } from "../middlewares/authz";
import { logger } from "../lib/logger";

const router = Router();

const CreateWebhookSchema = z.object({
  workspaceId: z.number(),
  type: z.enum(["slack", "discord"]),
  url: z.string().url(),
  name: z.string().min(1).max(100),
  events: z.string().default("all"),
});

const UpdateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  isActive: z.boolean().optional(),
  events: z.string().optional(),
});

// GET /api/notifications — List all webhooks for workspace
router.get("/", requireAuth, requireWorkspaceMember(), async (req, res) => {
  const workspaceId = Number(req.query.workspaceId);
  if (!workspaceId) return res.status(400).json({ error: "workspaceId required" });

  const webhooks = await db.select().from(webhooksTable)
    .where(eq(webhooksTable.workspaceId, workspaceId));
  res.json(webhooks);
});

// POST /api/notifications — Create webhook
router.post("/", requireAuth, requireWorkspaceMember(["owner", "admin"]), async (req, res) => {
  const body = CreateWebhookSchema.parse(req.body);
  const [webhook] = await db.insert(webhooksTable).values({
    ...body,
    isActive: true,
  }).returning();
  res.status(201).json(webhook);
});

// PATCH /api/notifications/:id — Update webhook
router.patch("/:id", requireAuth, requireWorkspaceMember(["owner", "admin"]), async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateWebhookSchema.parse(req.body);
  const [existing] = await db.select().from(webhooksTable)
    .where(and(eq(webhooksTable.id, id), eq(webhooksTable.workspaceId, Number(req.query.workspaceId))));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const [webhook] = await db.update(webhooksTable)
    .set(body)
    .where(eq(webhooksTable.id, id))
    .returning();
  res.json(webhook);
});

// DELETE /api/notifications/:id — Delete webhook
router.delete("/:id", requireAuth, requireWorkspaceMember(["owner", "admin"]), async (req, res) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(webhooksTable)
    .where(and(eq(webhooksTable.id, id), eq(webhooksTable.workspaceId, Number(req.query.workspaceId))));
  if (!existing) return res.status(404).json({ error: "Not found" });

  await db.delete(webhooksTable)
    .where(eq(webhooksTable.id, id));
  res.status(204).send();
});

// POST /api/notifications/test — Send test notification
router.post("/test", requireAuth, requireWorkspaceMember(), async (req, res) => {
  const { webhookId } = z.object({ webhookId: z.number() }).parse(req.body);
  const [webhook] = await db.select().from(webhooksTable)
    .where(eq(webhooksTable.id, webhookId));
  if (!webhook) return res.status(404).json({ error: "Webhook not found" });

  const payload = webhook.type === "slack"
    ? { text: "\ud83d\udd14 *CostPilot Test Notification*\n\nYour notification channel is configured correctly!\n\n_You will receive alerts for:_ budget thresholds, anomaly detection, trial expirations, and spending spikes." }
    : { content: "\ud83d\udd14 **CostPilot Test Notification**\n\nYour notification channel is configured correctly!\n\n*You will receive alerts for:* budget thresholds, anomaly detection, trial expirations, and spending spikes." };

  try {
    const resp = await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`Webhook responded with ${resp.status}`);
    res.json({ success: true, message: "Test notification sent successfully!" });
  } catch (err) {
    res.status(502).json({ success: false, message: "Failed to send test notification. Check your webhook URL." });
  }
});

export default router;
