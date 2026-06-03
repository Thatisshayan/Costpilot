import { Router } from "express";
import {
  db,
  webhooksTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// List Webhooks
router.get("/", async (req, res) => {
  const workspaceId = parseInt(req.query.workspaceId as string);
  
  const webhooks = await db
    .select()
    .from(webhooksTable)
    .where(eq(webhooksTable.workspaceId, workspaceId));

  res.json(webhooks);
});

// Create Webhook
router.post("/", async (req, res) => {
  const { workspaceId, type, url, name, events } = req.body;

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

import { processStripeWebhook, processProviderUsage } from "../services/webhook-processor";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock");

// ... existing routes ...

// Stripe Webhook Endpoint
router.post("/stripe", async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // In a real environment, we'd use stripe.webhooks.constructEvent
    // For the demo, we'll process the body directly if verified by a header
    event = req.body;
    
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
