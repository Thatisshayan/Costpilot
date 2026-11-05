import { resourceScope } from "../lib/resource-scope";
import { getWorkspaceMember } from "../middlewares/authz";
import { z } from "zod";
import { Router } from "express";
import { db, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const projects = await db
    .select()
    .from(projectsTable)
    .where(resourceScope(projectsTable, req.userId!))
    .orderBy(projectsTable.name);
  res.json(projects.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const body = CreateProjectBody.parse(req.body);
  const { workspaceId = null } = z.object({ workspaceId: z.number().int().positive().nullable().optional() }).parse(req.body);
  if (workspaceId !== null) {
    const member = await getWorkspaceMember(workspaceId, req.userId!);
    if (!member || !["owner", "admin"].includes(member.role)) {
      res.status(403).json({ error: "Workspace write permission required" });
      return;
    }
  }
  const [project] = await db.insert(projectsTable).values({ ...body, workspaceId, userId: req.userId! }).returning();
  res.status(201).json({ ...project, createdAt: project.createdAt.toISOString() });
});

router.get("/:id", async (req, res) => {
  const { id } = GetProjectParams.parse({ id: Number(req.params.id) });
  const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, id), resourceScope(projectsTable, req.userId!, req.method !== "GET")));
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...project, createdAt: project.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  if (req.body.workspaceId !== undefined) { res.status(400).json({ error: "Workspace assignment is immutable" }); return; }
  const { id } = UpdateProjectParams.parse({ id: Number(req.params.id) });
  const body = UpdateProjectBody.parse(req.body);
  const [project] = await db
    .update(projectsTable)
    .set(body)
    .where(and(eq(projectsTable.id, id), resourceScope(projectsTable, req.userId!, req.method !== "GET")))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...project, createdAt: project.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteProjectParams.parse({ id: Number(req.params.id) });
  await db.delete(projectsTable).where(and(eq(projectsTable.id, id), resourceScope(projectsTable, req.userId!, req.method !== "GET")));
  res.status(204).send();
});

export default router;
