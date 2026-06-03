import { Router } from "express";
import { db, toolsTable, platformsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateToolBody,
  UpdateToolBody,
  UpdateToolParams,
  DeleteToolParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const tools = await db
    .select({
      id: toolsTable.id,
      projectId: toolsTable.projectId,
      projectName: projectsTable.name,
      platformId: toolsTable.platformId,
      platformName: platformsTable.name,
      name: toolsTable.name,
      url: toolsTable.url,
      description: toolsTable.description,
      category: toolsTable.category,
      isPinned: toolsTable.isPinned,
      createdAt: toolsTable.createdAt,
    })
    .from(toolsTable)
    .leftJoin(projectsTable, eq(toolsTable.projectId, projectsTable.id))
    .leftJoin(platformsTable, eq(toolsTable.platformId, platformsTable.id))
    .where(eq(toolsTable.userId, req.userId!))
    .orderBy(toolsTable.isPinned, toolsTable.name);
  res.json(tools.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const body = CreateToolBody.parse(req.body);
  const [tool] = await db.insert(toolsTable).values({ ...body, userId: req.userId! }).returning();
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, tool.projectId));
  const [platform] = tool.platformId
    ? await db.select().from(platformsTable).where(eq(platformsTable.id, tool.platformId))
    : [null];
  res.status(201).json({
    ...tool,
    projectName: project?.name ?? null,
    platformName: platform?.name ?? null,
    createdAt: tool.createdAt.toISOString(),
  });
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateToolParams.parse({ id: Number(req.params.id) });
  const body = UpdateToolBody.parse(req.body);
  const [tool] = await db
    .update(toolsTable)
    .set(body)
    .where(and(eq(toolsTable.id, id), eq(toolsTable.userId, req.userId!)))
    .returning();
  if (!tool) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, tool.projectId));
  const [platform] = tool.platformId
    ? await db.select().from(platformsTable).where(eq(platformsTable.id, tool.platformId))
    : [null];
  res.json({
    ...tool,
    projectName: project?.name ?? null,
    platformName: platform?.name ?? null,
    createdAt: tool.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteToolParams.parse({ id: Number(req.params.id) });
  await db.delete(toolsTable).where(and(eq(toolsTable.id, id), eq(toolsTable.userId, req.userId!)));
  res.status(204).send();
});

export default router;
