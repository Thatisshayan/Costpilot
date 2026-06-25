import { Router } from "express";
import {
  db,
  webhooksTable,
  workspacesTable,
  workspaceMembersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireWorkspaceMember } from "../middlewares/authz";
import { CreateWebhookBody } from "@workspace/api-zod";
import { processStripeWebhook, processProviderUsage } from "../services/webhook-processor";
import Stripe from "stripe";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    if (!webhookSecret) {
      res.status(401).send("Missing STRIPE_WEBHOOK_SECRET");
      return;
    }
    if (!sig) {
      res.status(401).send("Missing stripe-signature header");
      return;
    }
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody || req.body,
      sig as string,
      webhookSecret
    );

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
  
  if (!process.env.WEBHOOK_SECRET) {
    res.status(500).json({ error: "Server misconfigured: WEBHOOK_SECRET not set" });
    return;
  }

  if (secret !== process.env.WEBHOOK_SECRET) {
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

// Helper function to verify Clerk's webhook signature (SVIX specification)
function verifyClerkSignature(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  secret: string
): boolean {
  const svixId = headers["svix-id"];
  const svixTimestamp = headers["svix-timestamp"];
  const svixSignature = headers["svix-signature"];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  if (typeof svixId !== "string" || typeof svixTimestamp !== "string" || typeof svixSignature !== "string") {
    return false;
  }

  // Drift check (5 minutes = 300 seconds)
  const timestamp = parseInt(svixTimestamp, 10);
  if (isNaN(timestamp)) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return false;
  }

  // Construct signed content
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

  // Strip 'whsec_' prefix if present
  const secretKey = secret.startsWith("whsec_") ? secret.substring(6) : secret;
  const secretBuffer = Buffer.from(secretKey, "base64");

  // Compute expected signature
  const hmac = crypto.createHmac("sha256", secretBuffer);
  hmac.update(signedContent);
  const computedSignature = hmac.digest(); // Raw Buffer

  // Parse passed signatures from headers
  const passedSignatures = svixSignature.split(" ");
  for (const sig of passedSignatures) {
    const parts = sig.split(",");
    if (parts.length === 2 && parts[0] === "v1") {
      const base64Sig = parts[1];
      const passedBuffer = Buffer.from(base64Sig, "base64");
      
      if (computedSignature.length === passedBuffer.length) {
        if (crypto.timingSafeEqual(computedSignature, passedBuffer)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Clerk Webhook Endpoint
router.post("/clerk", async (req, res) => {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  const rawBody = (req as any).rawBody;

  if (!secret) {
    logger.error("CLERK_WEBHOOK_SIGNING_SECRET is not configured");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!rawBody) {
    logger.error("Clerk Webhook verification failed: req.rawBody is missing");
    res.status(400).json({ error: "Missing request rawBody" });
    return;
  }

  const bodyString = rawBody instanceof Buffer ? rawBody.toString("utf8") : rawBody;
  const isValid = verifyClerkSignature(bodyString, req.headers, secret);

  if (!isValid) {
    logger.warn("Clerk Webhook received with invalid signature");
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  let body: any;
  try {
    body = JSON.parse(bodyString);
  } catch (err) {
    logger.error({ err }, "Clerk Webhook failed to parse rawBody as JSON");
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  if (!body) {
    res.status(400).json({ error: "Missing webhook payload" });
    return;
  }

  const { type, data } = body;
  if (!type || !data) {
    res.status(400).json({ error: "Malformed webhook payload" });
    return;
  }

  if (type === "user.created") {
    const userId = data.id;
    if (!userId) {
      res.status(400).json({ error: "Missing user id in webhook data" });
      return;
    }

    const firstName = data.first_name || data.firstName || "My";
    const emailAddresses = data.email_addresses || data.emailAddresses || [];
    const email = emailAddresses[0]?.email_address || emailAddresses[0]?.emailAddress || "unknown@example.com";

    const workspaceName = `${firstName}'s Workspace`;
    const slug = `workspace-${userId}`.toLowerCase();

    try {
      await db.transaction(async (tx) => {
        const [workspace] = await tx
          .insert(workspacesTable)
          .values({
            name: workspaceName,
            slug,
            ownerId: userId,
          })
          .returning();

        await tx.insert(workspaceMembersTable).values({
          workspaceId: workspace.id,
          userId,
          role: "owner",
          email,
        });
      });

      logger.info({ userId, slug }, "Clerk webhook: default workspace and member owner provisioned successfully");
      res.status(200).json({ success: true, message: "Workspace provisioned" });
    } catch (err) {
      logger.error({ err, userId }, "Failed to provision workspace during Clerk user.created event");
      res.status(500).json({ error: "Failed to provision workspace" });
    }
  } else {
    res.status(200).json({ message: `Acknowledged event type: ${type}` });
  }
});

export default router;