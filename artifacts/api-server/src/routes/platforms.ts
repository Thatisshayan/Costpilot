import { Router } from "express";
import { db, platformsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreatePlatformBody,
  UpdatePlatformBody,
  GetPlatformParams,
  UpdatePlatformParams,
  DeletePlatformParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const platforms = await db
    .select()
    .from(platformsTable)
    .orderBy(platformsTable.name);
  res.json(platforms.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const body = CreatePlatformBody.parse(req.body);
  const [platform] = await db.insert(platformsTable).values(body).returning();
  res.status(201).json({ ...platform, createdAt: platform.createdAt.toISOString() });
});

router.get("/:id", async (req, res) => {
  const { id } = GetPlatformParams.parse({ id: Number(req.params.id) });
  const [platform] = await db.select().from(platformsTable).where(eq(platformsTable.id, id));
  if (!platform) return res.status(404).json({ error: "Not found" });
  res.json({ ...platform, createdAt: platform.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdatePlatformParams.parse({ id: Number(req.params.id) });
  const body = UpdatePlatformBody.parse(req.body);
  const [platform] = await db
    .update(platformsTable)
    .set(body)
    .where(eq(platformsTable.id, id))
    .returning();
  if (!platform) return res.status(404).json({ error: "Not found" });
  res.json({ ...platform, createdAt: platform.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeletePlatformParams.parse({ id: Number(req.params.id) });
  await db.delete(platformsTable).where(eq(platformsTable.id, id));
  res.status(204).send();
});

export default router;
