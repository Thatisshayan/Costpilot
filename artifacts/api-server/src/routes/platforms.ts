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
import { encrypt, decrypt } from "../lib/kms-vault";
import { isWorkspaceMember } from "../middlewares/auth";

const router = Router();

// Helper to mask API key
const maskApiKey = (key: string | null) => {
  if (!key) return null;
  // If it's already masked or very short, just return a generic mask
  if (key.length < 8) return "********";
  // Usually API keys have a prefix like sk- or sk-proj-
  if (key.startsWith("{") || key.split(":").length >= 3) {
     return "••••••••••••••••";
  }
  return "********";
};

router.get("/", async (req, res) => {
  const reveal = req.query.reveal === "true" || req.headers["x-reveal-key"] === "true";
  const platforms = await db.select().from(platformsTable).where(eq(platformsTable.userId, req.userId!)).orderBy(platformsTable.name);
  
  const results = [];
  for (const p of platforms) {
    let apiKey: string | null = null;
    if (p.apiKey) {
      if (reveal) {
        const authorized = p.workspaceId 
          ? await isWorkspaceMember(p.workspaceId, req.userId!, ["owner", "admin"])
          : true;
        
        apiKey = authorized ? decrypt(p.apiKey) : "••••••••";
      } else {
        apiKey = "••••••••";
      }
    }
    results.push({
      ...p,
      apiKey,
      createdAt: p.createdAt.toISOString()
    });
  }
  res.json(results);
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
  const reveal = req.query.reveal === "true" || req.headers["x-reveal-key"] === "true";
  const [platform] = await db.select().from(platformsTable).where(and(eq(platformsTable.id, id), eq(platformsTable.userId, req.userId!)));
  if (!platform) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  let apiKey: string | null = null;
  if (platform.apiKey) {
    if (reveal) {
      const authorized = platform.workspaceId
        ? await isWorkspaceMember(platform.workspaceId, req.userId!, ["owner", "admin"])
        : true;
      apiKey = authorized ? decrypt(platform.apiKey) : "••••••••";
    } else {
      apiKey = "••••••••";
    }
  }
  res.json({ 
    ...platform, 
    apiKey,
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
  if (!platform) {
    res.status(404).json({ error: "Not found" });
    return;
  }
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
