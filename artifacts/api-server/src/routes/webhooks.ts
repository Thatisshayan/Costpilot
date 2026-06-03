import { Router } from "express";
import {
  db,
  webhooksTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireWorkspaceMember } from "../middlewares/authz";
import { CreateWebhookBody } from "@workspace/api-zod";
import { processStripeWebhook, processProviderUsage } from "../services/webhook-processor";
import Stripe from "stripe";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock");

// List Webhooks
router.get("/", requireWorkspaceMember(["owner", "admin", "viewer"]), async (req, res) => {
  const workspaceId = parseInt(req.query.workspaceId as string);
  
  const webhooks = await db
    .select()
    .from(webhooksTable)
    .where(eq(webhooksTable.workspaceId, workspaceId));

  res.json(webhooks);
});

// Create Webhook
router.post("/", requireWorkspaceMember(["owner", "admin"]), async (req, res) => {
  const body = CreateWebhookBody.parse(req.body);
  const { workspaceId, type, url, name, events } = body;

  const [webhook] = await db
    .insert(webhooksTable)
    .values({
      workspaceId,
      type,
      url,
      name,
      events: events || "expiring_trials,large_expenses",
    })
    .returning();

  res.status(201).json(webhook);
});

// Stripe Webhook Endpoint
router.post("/stripe", async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody || req.body,
        sig as string,
        webhookSecret
      );
    } else {
      event = req.body;
    }
    
    const result = await processStripeWebhook(event);
    res.json(result);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
});

// Incoming Provider Webhooks (e.g., from OpenAI, Anthropic)
router.post("/incoming/:provider", async (req, res) => {
  const { provider } = req.params;
  const secret = req.headers['x-costpilot-secret'];
  
  // Security check
  if (secret !== process.env.WEBHOOK_SECRET && process.env.NODE_ENV === 'production') {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = await processProviderUsage(provider, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to process usage webhook" });
  }
});

export default router;
