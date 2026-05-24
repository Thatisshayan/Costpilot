import { Router } from "express";
import { db, platformsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreatePlatformBody,
  UpdatePlatformBody,
  GetPlatformParams,
  UpdatePlatformParams,
  DeletePlatformParams,
} from "@workspace/api-zod";
import syncRouter from "./sync";
import { encrypt } from "../lib/encryption";

const router = Router();

// Helper to mask API key
const maskApiKey = (key: string | null) => {
  if (!key) return null;
  // If it's already masked or very short, just return a generic mask
  if (key.length < 8) return "********";
  // Usually API keys have a prefix like sk- or sk-proj-
  const parts = key.split(":"); // Our encryption format is iv:tag:content
  if (parts.length === 3) {
     return "••••••••••••••••";
  }
  return "********";
};

router.get("/", async (req, res) => {
  const platforms = await db.select().from(platformsTable).where(eq(platformsTable.userId, req.userId!)).orderBy(platformsTable.name);
  res.json(platforms.map((p) => ({ 
    ...p, 
    apiKey: p.apiKey ? "••••••••" : null,
    createdAt: p.createdAt.toISOString() 
  })));
});

router.post("/", async (req, res) => {
  const body = CreatePlatformBody.parse(req.body);
  if (body.apiKey) {
    body.apiKey = encrypt(body.apiKey);
  }
  const [platform] = await db.insert(platformsTable).values({ ...body, userId: req.userId! }).returning();
  res.status(201).json({ 
    ...platform, 
    apiKey: platform.apiKey ? "••••••••" : null,
    createdAt: platform.createdAt.toISOString() 
  });
});

router.get("/:id", async (req, res) => {
  const { id } = GetPlatformParams.parse({ id: Number(req.params.id) });
  const [platform] = await db.select().from(platformsTable).where(and(eq(platformsTable.id, id), eq(platformsTable.userId, req.userId!)));
  if (!platform) return res.status(404).json({ error: "Not found" });
  res.json({ 
    ...platform, 
    apiKey: platform.apiKey ? "••••••••" : null,
    createdAt: platform.createdAt.toISOString() 
  });
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdatePlatformParams.parse({ id: Number(req.params.id) });
  const body = UpdatePlatformBody.parse(req.body);
  
  if (body.apiKey) {
    body.apiKey = encrypt(body.apiKey);
  }

  const [platform] = await db.update(platformsTable).set(body).where(and(eq(platformsTable.id, id), eq(platformsTable.userId, req.userId!))).returning();
  if (!platform) return res.status(404).json({ error: "Not found" });
  res.json({ 
    ...platform, 
    apiKey: platform.apiKey ? "••••••••" : null,
    createdAt: platform.createdAt.toISOString() 
  });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeletePlatformParams.parse({ id: Number(req.params.id) });
  await db.delete(platformsTable).where(and(eq(platformsTable.id, id), eq(platformsTable.userId, req.userId!)));
  res.status(204).send();
});

router.use("/:id", syncRouter);

export default router;
