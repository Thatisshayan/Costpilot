import { Router } from "express";
import { db, subscriptionsTable, platformsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateSubscriptionBody,
  UpdateSubscriptionBody,
  GetSubscriptionParams,
  UpdateSubscriptionParams,
  DeleteSubscriptionParams,
} from "@workspace/api-zod";

const router = Router();

function calcDaysUntilExpiry(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;
  const end = new Date(trialEndDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatSub(s: {
  id: number;
  platformId: number;
  platformName: string | null;
  projectId: number | null;
  projectName: string | null;
  planName: string;
  planType: string;
  status: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  renewalDate: string | null;
  monthlyCost: string | null;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    ...s,
    monthlyCost: s.monthlyCost !== null ? Number(s.monthlyCost) : null,
    daysUntilExpiry: calcDaysUntilExpiry(s.trialEndDate),
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const subs = await db
    .select({
      id: subscriptionsTable.id,
      platformId: subscriptionsTable.platformId,
      platformName: platformsTable.name,
      projectId: subscriptionsTable.projectId,
      projectName: projectsTable.name,
      planName: subscriptionsTable.planName,
      planType: subscriptionsTable.planType,
      status: subscriptionsTable.status,
      trialStartDate: subscriptionsTable.trialStartDate,
      trialEndDate: subscriptionsTable.trialEndDate,
      renewalDate: subscriptionsTable.renewalDate,
      monthlyCost: subscriptionsTable.monthlyCost,
      notes: subscriptionsTable.notes,
      createdAt: subscriptionsTable.createdAt,
    })
    .from(subscriptionsTable)
    .leftJoin(platformsTable, eq(subscriptionsTable.platformId, platformsTable.id))
    .leftJoin(projectsTable, eq(subscriptionsTable.projectId, projectsTable.id))
    .where(eq(subscriptionsTable.userId, req.userId!))
    .orderBy(subscriptionsTable.createdAt);
  res.json(subs.map(formatSub));
});

router.post("/", async (req, res) => {
  const body = CreateSubscriptionBody.parse(req.body);
  const insertData: Record<string, unknown> = { ...body };
  if (body.monthlyCost !== undefined) insertData.monthlyCost = String(body.monthlyCost);
  const [sub] = await db.insert(subscriptionsTable).values({
    ...insertData,
    userId: req.userId!
  } as any).returning();
  const [platform] = await db.select().from(platformsTable).where(eq(platformsTable.id, sub.platformId));
  const [project] = sub.projectId
    ? await db.select().from(projectsTable).where(eq(projectsTable.id, sub.projectId))
    : [null];
  res.status(201).json(formatSub({ ...sub, platformName: platform?.name ?? null, projectName: project?.name ?? null }));
});

router.get("/:id", async (req, res) => {
  const { id } = GetSubscriptionParams.parse({ id: Number(req.params.id) });
  const [sub] = await db
    .select({
      id: subscriptionsTable.id,
      platformId: subscriptionsTable.platformId,
      platformName: platformsTable.name,
      projectId: subscriptionsTable.projectId,
      projectName: projectsTable.name,
      planName: subscriptionsTable.planName,
      planType: subscriptionsTable.planType,
      status: subscriptionsTable.status,
      trialStartDate: subscriptionsTable.trialStartDate,
      trialEndDate: subscriptionsTable.trialEndDate,
      renewalDate: subscriptionsTable.renewalDate,
      monthlyCost: subscriptionsTable.monthlyCost,
      notes: subscriptionsTable.notes,
      createdAt: subscriptionsTable.createdAt,
    })
    .from(subscriptionsTable)
    .leftJoin(platformsTable, eq(subscriptionsTable.platformId, platformsTable.id))
    .leftJoin(projectsTable, eq(subscriptionsTable.projectId, projectsTable.id))
    .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, req.userId!)));
  if (!sub) return res.status(404).json({ error: "Not found" });
  res.json(formatSub(sub));
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateSubscriptionParams.parse({ id: Number(req.params.id) });
  const body = UpdateSubscriptionBody.parse(req.body);
  const updateData: Record<string, unknown> = { ...body };
  if (body.monthlyCost !== undefined) updateData.monthlyCost = String(body.monthlyCost);
  const [sub] = await db
    .update(subscriptionsTable)
    .set(updateData)
    .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, req.userId!)))
    .returning();
  if (!sub) return res.status(404).json({ error: "Not found" });
  const [platform] = await db.select().from(platformsTable).where(eq(platformsTable.id, sub.platformId));
  const [project] = sub.projectId
    ? await db.select().from(projectsTable).where(eq(projectsTable.id, sub.projectId))
    : [null];
  res.json(formatSub({ ...sub, platformName: platform?.name ?? null, projectName: project?.name ?? null }));
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteSubscriptionParams.parse({ id: Number(req.params.id) });
  await db.delete(subscriptionsTable).where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, req.userId!)));
  res.status(204).send();
});

export default router;
