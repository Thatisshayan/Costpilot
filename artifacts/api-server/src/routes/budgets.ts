import { Router } from "express";
import { db, budgetPoliciesTable, expensesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

const CreatePolicySchema = z.object({
  name: z.string().min(1),
  thresholdAmount: z.number().positive(),
  action: z.enum(["warn", "block", "downgrade"]),
  isActive: z.boolean().optional().default(true),
  workspaceId: z.number().optional(),
  projectId: z.number().optional().nullable(),
});

const UpdatePolicySchema = CreatePolicySchema.partial();

router.get("/", requireAuth, async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId ? Number(req.query.workspaceId) : undefined;
    const conditions = [eq(budgetPoliciesTable.userId, req.userId!)];
    if (workspaceId) {
      conditions.push(eq(budgetPoliciesTable.workspaceId, workspaceId));
    }
    const policies = await db
      .select()
      .from(budgetPoliciesTable)
      .where(and(...conditions))
      .orderBy(budgetPoliciesTable.createdAt);
    res.json(policies.map((p) => ({ ...p, thresholdAmount: Number(p.thresholdAmount) })));
  } catch (err) {
    logger.error(err, "Failed to list budget policies");
    res.status(500).json({ error: "Failed to list budget policies" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = CreatePolicySchema.parse(req.body);
    const [policy] = await db
      .insert(budgetPoliciesTable)
      .values({
        userId: req.userId!,
        name: body.name,
        thresholdAmount: String(body.thresholdAmount),
        action: body.action,
        isActive: body.isActive,
        workspaceId: body.workspaceId ?? null,
        projectId: body.projectId ?? null,
      })
      .returning();
    res.status(201).json({ ...policy, thresholdAmount: Number(policy.thresholdAmount) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.errors });
      return;
    }
    logger.error(err, "Failed to create budget policy");
    res.status(500).json({ error: "Failed to create budget policy" });
  }
});

router.get("/evaluate", requireAuth, async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId ? Number(req.query.workspaceId) : undefined;
    const conditions = [
      eq(budgetPoliciesTable.userId, req.userId!),
      eq(budgetPoliciesTable.isActive, true),
    ];
    if (workspaceId) {
      conditions.push(eq(budgetPoliciesTable.workspaceId, workspaceId));
    }
    const activePolicies = await db
      .select()
      .from(budgetPoliciesTable)
      .where(and(...conditions))
      .orderBy(budgetPoliciesTable.createdAt);

    const [totalRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
      .from(expensesTable)
      .where(eq(expensesTable.userId, req.userId!));

    const currentSpend = Number(totalRow.total);
    const triggered: Array<{ policy: typeof activePolicies[number]; currentSpend: number; exceededBy: number }> = [];

    for (const policy of activePolicies) {
      const threshold = Number(policy.thresholdAmount);
      if (currentSpend > threshold) {
        triggered.push({
          policy: { ...policy, thresholdAmount: threshold as any },
          currentSpend,
          exceededBy: currentSpend - threshold,
        });
      }
    }
    res.json({ currentSpend, totalPolicies: activePolicies.length, triggered });
  } catch (err) {
    logger.error(err, "Failed to evaluate budget policies");
    res.status(500).json({ error: "Failed to evaluate budget policies" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdatePolicySchema.parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.thresholdAmount !== undefined) updateData.thresholdAmount = String(body.thresholdAmount);
    if (body.action !== undefined) updateData.action = body.action;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.workspaceId !== undefined) updateData.workspaceId = body.workspaceId;
    if (body.projectId !== undefined) updateData.projectId = body.projectId;

    const [policy] = await db
      .update(budgetPoliciesTable)
      .set(updateData)
      .where(and(eq(budgetPoliciesTable.id, id), eq(budgetPoliciesTable.userId, req.userId!)))
      .returning();
    if (!policy) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...policy, thresholdAmount: Number(policy.thresholdAmount) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: err.errors });
      return;
    }
    logger.error(err, "Failed to update budget policy");
    res.status(500).json({ error: "Failed to update budget policy" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db
      .delete(budgetPoliciesTable)
      .where(and(eq(budgetPoliciesTable.id, id), eq(budgetPoliciesTable.userId, req.userId!)));
    res.status(204).send();
  } catch (err) {
    logger.error(err, "Failed to delete budget policy");
    res.status(500).json({ error: "Failed to delete budget policy" });
  }
});

export default router;
