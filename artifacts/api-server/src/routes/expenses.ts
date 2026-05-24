import { Router } from "express";
import { db, expensesTable, platformsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateExpenseBody,
  UpdateExpenseBody,
  GetExpenseParams,
  UpdateExpenseParams,
  DeleteExpenseParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const expenses = await db
    .select({
      id: expensesTable.id,
      platformId: expensesTable.platformId,
      platformName: platformsTable.name,
      projectId: expensesTable.projectId,
      projectName: projectsTable.name,
      amount: expensesTable.amount,
      currency: expensesTable.currency,
      description: expensesTable.description,
      category: expensesTable.category,
      date: expensesTable.date,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .leftJoin(platformsTable, eq(expensesTable.platformId, platformsTable.id))
    .leftJoin(projectsTable, eq(expensesTable.projectId, projectsTable.id))
    .where(eq(expensesTable.userId, req.userId!))
    .orderBy(expensesTable.date);
  res.json(expenses.map((e) => ({
    ...e,
    amount: Number(e.amount),
    createdAt: e.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const body = CreateExpenseBody.parse(req.body);
  const [expense] = await db.insert(expensesTable).values({
    ...body,
    userId: req.userId!,
    amount: String(body.amount),
  }).returning();
  const [platform] = body.platformId
    ? await db.select().from(platformsTable).where(eq(platformsTable.id, body.platformId))
    : [null];
  const [project] = body.projectId
    ? await db.select().from(projectsTable).where(eq(projectsTable.id, body.projectId))
    : [null];
  res.status(201).json({
    ...expense,
    amount: Number(expense.amount),
    platformName: platform?.name ?? null,
    projectName: project?.name ?? null,
    createdAt: expense.createdAt.toISOString(),
  });
});

router.get("/:id", async (req, res) => {
  const { id } = GetExpenseParams.parse({ id: Number(req.params.id) });
  const [expense] = await db
    .select({
      id: expensesTable.id,
      platformId: expensesTable.platformId,
      platformName: platformsTable.name,
      projectId: expensesTable.projectId,
      projectName: projectsTable.name,
      amount: expensesTable.amount,
      currency: expensesTable.currency,
      description: expensesTable.description,
      category: expensesTable.category,
      date: expensesTable.date,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .leftJoin(platformsTable, eq(expensesTable.platformId, platformsTable.id))
    .leftJoin(projectsTable, eq(expensesTable.projectId, projectsTable.id))
    .where(and(eq(expensesTable.id, id), eq(expensesTable.userId, req.userId!)));
  if (!expense) return res.status(404).json({ error: "Not found" });
  res.json({ ...expense, amount: Number(expense.amount), createdAt: expense.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateExpenseParams.parse({ id: Number(req.params.id) });
  const body = UpdateExpenseBody.parse(req.body);
  const updateData: Record<string, unknown> = { ...body };
  if (body.amount !== undefined) updateData.amount = String(body.amount);
  const [expense] = await db
    .update(expensesTable)
    .set(updateData)
    .where(and(eq(expensesTable.id, id), eq(expensesTable.userId, req.userId!)))
    .returning();
  if (!expense) return res.status(404).json({ error: "Not found" });
  const [platform] = expense.platformId
    ? await db.select().from(platformsTable).where(eq(platformsTable.id, expense.platformId))
    : [null];
  const [project] = expense.projectId
    ? await db.select().from(projectsTable).where(eq(projectsTable.id, expense.projectId))
    : [null];
  res.json({
    ...expense,
    amount: Number(expense.amount),
    platformName: platform?.name ?? null,
    projectName: project?.name ?? null,
    createdAt: expense.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteExpenseParams.parse({ id: Number(req.params.id) });
  await db.delete(expensesTable).where(and(eq(expensesTable.id, id), eq(expensesTable.userId, req.userId!)));
  res.status(204).send();
});

// Bulk Import Transactions
router.post("/import-batch", async (req, res) => {
  const { transactions } = req.body;
  const userId = req.userId!;
  
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: "Transactions must be an array" });
  }

  try {
    const formatted = transactions.map(t => ({
      ...t,
      userId,
      amount: t.amount?.toString(),
    }));

    const inserted = await db.insert(expensesTable).values(formatted).returning();
    res.status(201).json({ count: inserted.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to import batch" });
  }
});

export default router;
