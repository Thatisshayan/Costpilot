import { Router } from "express";
import { db, creditPurchasesTable, platformsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateCreditPurchaseBody,
  UpdateCreditPurchaseBody,
  UpdateCreditPurchaseParams,
  DeleteCreditPurchaseParams,
} from "@workspace/api-zod";

const router = Router();

function formatCredit(c: {
  id: number;
  platformId: number;
  platformName: string | null;
  projectId: number | null;
  projectName: string | null;
  amount: string;
  credits: string | null;
  currency: string;
  description: string | null;
  purchaseDate: string;
  createdAt: Date;
}) {
  return {
    ...c,
    amount: Number(c.amount),
    credits: c.credits !== null ? Number(c.credits) : null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const rows = await db
    .select({
      id: creditPurchasesTable.id,
      platformId: creditPurchasesTable.platformId,
      platformName: platformsTable.name,
      projectId: creditPurchasesTable.projectId,
      projectName: projectsTable.name,
      amount: creditPurchasesTable.amount,
      credits: creditPurchasesTable.credits,
      currency: creditPurchasesTable.currency,
      description: creditPurchasesTable.description,
      purchaseDate: creditPurchasesTable.purchaseDate,
      createdAt: creditPurchasesTable.createdAt,
    })
    .from(creditPurchasesTable)
    .leftJoin(platformsTable, eq(creditPurchasesTable.platformId, platformsTable.id))
    .leftJoin(projectsTable, eq(creditPurchasesTable.projectId, projectsTable.id))
    .where(eq(creditPurchasesTable.userId, req.userId!))
    .orderBy(creditPurchasesTable.purchaseDate);
  res.json(rows.map(formatCredit));
});

router.post("/", async (req, res) => {
  const body = CreateCreditPurchaseBody.parse(req.body);
  const [row] = await db
    .insert(creditPurchasesTable)
    .values({
      ...body,
      userId: req.userId!,
      amount: String(body.amount),
      credits: body.credits !== undefined ? String(body.credits) : undefined,
    })
    .returning();
  const [platform] = await db.select().from(platformsTable).where(eq(platformsTable.id, row.platformId));
  const [project] = row.projectId
    ? await db.select().from(projectsTable).where(eq(projectsTable.id, row.projectId))
    : [null];
  res.status(201).json(formatCredit({ ...row, platformName: platform?.name ?? null, projectName: project?.name ?? null }));
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateCreditPurchaseParams.parse({ id: Number(req.params.id) });
  const body = UpdateCreditPurchaseBody.parse(req.body);
  const updateData: Record<string, unknown> = { ...body };
  if (body.amount !== undefined) updateData.amount = String(body.amount);
  if (body.credits !== undefined) updateData.credits = String(body.credits);
  const [row] = await db
    .update(creditPurchasesTable)
    .set(updateData)
    .where(and(eq(creditPurchasesTable.id, id), eq(creditPurchasesTable.userId, req.userId!)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [platform] = await db.select().from(platformsTable).where(eq(platformsTable.id, row.platformId));
  const [project] = row.projectId
    ? await db.select().from(projectsTable).where(eq(projectsTable.id, row.projectId))
    : [null];
  res.json(formatCredit({ ...row, platformName: platform?.name ?? null, projectName: project?.name ?? null }));
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteCreditPurchaseParams.parse({ id: Number(req.params.id) });
  await db.delete(creditPurchasesTable).where(and(eq(creditPurchasesTable.id, id), eq(creditPurchasesTable.userId, req.userId!)));
  res.status(204).send();
});

export default router;
