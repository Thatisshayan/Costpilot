// Monthly budgets (Batch 3). Replaces nothing: the legacy, unmounted `routes/budgets.ts`
// (user-scoped, lifetime, cross-currency) stays untouched and unreachable.
//
// Rules:
// - A budget belongs to one scope: Personal (only its owner) or one workspace (active members
//   read; owners and admins write). It may be narrowed to one project from the same scope.
// - Actual spend uses the spend-summary semantics (lib/spend): net = charges + credits, month of
//   the expense date, current month to today (UTC). Only the budget's currency counts.
// - Money is exact: numeric sums from PostgreSQL, integer cents (BigInt) here.
import { Router } from "express";
import { z } from "zod";
import { and, asc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db, expensesTable, projectsTable, spendBudgetsTable, type SpendBudget } from "@workspace/db";
import { getWorkspaceMember } from "../middlewares/authz";
import { resourceScope } from "../lib/resource-scope";
import { fromCents, monthPeriod, scopeCondition, toCents } from "../lib/spend";
import { budgetStatus, DEFAULT_THRESHOLDS, thresholdsIssue } from "../lib/budget-math";

const router = Router();
const WRITE_ROLES = new Set(["owner", "admin"]);

const AMOUNT = /^\d{1,10}(\.\d{1,2})?$/;
// Zod still runs refinements after a failed regex, so the positivity check guards its own input.
const amount = z.string().regex(AMOUNT, "amount must be a positive number with at most 2 decimals")
  .refine(v => !AMOUNT.test(v) || toCents(v) > 0n, "amount must be greater than zero");
const thresholds = z.array(z.number().int()).superRefine((value, ctx) => {
  const issue = thresholdsIssue(value);
  if (issue) ctx.addIssue({ code: "custom", message: issue });
});
const name = z.string().trim().min(1, "name is required").max(80, "name must be at most 80 characters");

const ScopeQuery = z.object({ workspaceId: z.coerce.number().int().positive().optional() }).strict();
const StatusQuery = ScopeQuery.extend({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM").optional(),
}).strict();
const CreateBody = z.object({
  workspaceId: z.number().int().positive().nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
  name,
  currency: z.string().regex(/^[A-Z]{3}$/, "currency must be a 3-letter ISO 4217 code"),
  amount,
  thresholds: thresholds.optional(),
}).strict();
const UpdateBody = z.object({ name: name.optional(), amount: amount.optional(), thresholds: thresholds.optional() }).strict();
const IdParam = z.object({ id: z.coerce.number().int().positive() });

function badRequest(res: import("express").Response, error: z.ZodError) {
  res.status(400).json({ error: "Bad Request", message: error.issues.map(i => (i.path.length ? `${i.path.join(".")}: ` : "") + i.message).join("; ") });
}

function isUniqueViolation(error: unknown): boolean {
  const err = error as { code?: string; cause?: { code?: string } } | null;
  return err?.code === "23505" || err?.cause?.code === "23505";
}

/** "ok", or why the caller may not read/write budgets in this scope. Personal is always the caller's own. */
async function scopeAccess(workspaceId: number | null, userId: string, write: boolean): Promise<"ok" | "forbidden" | "read_only"> {
  if (workspaceId === null) return "ok";
  const member = await getWorkspaceMember(workspaceId, userId);
  if (!member) return "forbidden";
  return !write || WRITE_ROLES.has(member.role) ? "ok" : "read_only";
}

function scopeOf(workspaceId: number | null, userId: string) {
  return workspaceId === null
    ? and(isNull(spendBudgetsTable.workspaceId), eq(spendBudgetsTable.userId, userId))!
    : eq(spendBudgetsTable.workspaceId, workspaceId);
}

async function projectInScope(projectId: number, workspaceId: number | null, userId: string): Promise<boolean> {
  const scope = workspaceId === null
    ? and(isNull(projectsTable.workspaceId), eq(projectsTable.userId, userId))
    : eq(projectsTable.workspaceId, workspaceId);
  const [project] = await db.select({ id: projectsTable.id }).from(projectsTable).where(and(eq(projectsTable.id, projectId), scope));
  return Boolean(project);
}

type BudgetRow = SpendBudget & { projectName: string | null };

async function listInScope(workspaceId: number | null, userId: string): Promise<BudgetRow[]> {
  const rows = await db.select({ budget: spendBudgetsTable, projectName: projectsTable.name })
    .from(spendBudgetsTable)
    .leftJoin(projectsTable, eq(spendBudgetsTable.projectId, projectsTable.id))
    .where(scopeOf(workspaceId, userId))
    .orderBy(sql`${spendBudgetsTable.projectId} IS NOT NULL`, asc(projectsTable.name), asc(spendBudgetsTable.currency), asc(spendBudgetsTable.id));
  return rows.map(r => ({ ...r.budget, projectName: r.projectName ?? null }));
}

function serialize(b: BudgetRow) {
  return {
    id: b.id, workspaceId: b.workspaceId, projectId: b.projectId, projectName: b.projectName, name: b.name,
    period: b.period, currency: b.currency, amount: fromCents(toCents(b.amount)), thresholds: b.thresholds,
    createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString(),
  };
}

async function findVisible(id: number, userId: string): Promise<BudgetRow | undefined> {
  const [row] = await db.select({ budget: spendBudgetsTable, projectName: projectsTable.name })
    .from(spendBudgetsTable)
    .leftJoin(projectsTable, eq(spendBudgetsTable.projectId, projectsTable.id))
    .where(and(eq(spendBudgetsTable.id, id), resourceScope(spendBudgetsTable, userId)));
  return row ? { ...row.budget, projectName: row.projectName ?? null } : undefined;
}

router.get("/", async (req, res) => {
  const parsed = ScopeQuery.safeParse(req.query);
  if (!parsed.success) { badRequest(res, parsed.error); return; }
  const workspaceId = parsed.data.workspaceId ?? null;
  if (await scopeAccess(workspaceId, req.userId!, false) !== "ok") {
    res.status(403).json({ error: "Forbidden", message: "Workspace membership required" });
    return;
  }
  res.json((await listInScope(workspaceId, req.userId!)).map(serialize));
});

router.get("/status", async (req, res) => {
  const parsed = StatusQuery.safeParse(req.query);
  if (!parsed.success) { badRequest(res, parsed.error); return; }
  const userId = req.userId!;
  const workspaceId = parsed.data.workspaceId ?? null;
  if (await scopeAccess(workspaceId, userId, false) !== "ok") {
    res.status(403).json({ error: "Forbidden", message: "Workspace membership required" });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  let period;
  try {
    period = monthPeriod(parsed.data.month ?? today.slice(0, 7), today);
  } catch (error) {
    res.status(400).json({ error: "Bad Request", message: (error as Error).message });
    return;
  }
  const budgets = await listInScope(workspaceId, userId);
  // One grouped query for the scope and period; each budget then takes its currency (and project).
  const sums = budgets.length === 0 ? [] : await db.select({
    currency: expensesTable.currency,
    projectId: expensesTable.projectId,
    charges: sql<string>`coalesce(sum(${expensesTable.amount}) filter (where ${expensesTable.amount} >= 0), 0)::numeric(20,2)::text`,
    credits: sql<string>`coalesce(sum(${expensesTable.amount}) filter (where ${expensesTable.amount} < 0), 0)::numeric(20,2)::text`,
    count: sql<number>`count(*)::int`,
  }).from(expensesTable)
    .where(and(scopeCondition({ userId, workspaceId }), gte(expensesTable.date, period.start), lte(expensesTable.date, period.through)))
    .groupBy(expensesTable.currency, expensesTable.projectId);

  res.json({
    workspaceId,
    period,
    budgets: budgets.map(budget => {
      const rows = sums.filter(s => s.currency === budget.currency && (budget.projectId === null || s.projectId === budget.projectId));
      const charges = rows.reduce((total, r) => total + toCents(r.charges), 0n);
      const credits = rows.reduce((total, r) => total + toCents(r.credits), 0n);
      const net = charges + credits;
      const status = budgetStatus(toCents(budget.amount), net, budget.thresholds);
      return {
        budget: serialize(budget),
        net: fromCents(net),
        charges: fromCents(charges),
        credits: fromCents(credits),
        count: rows.reduce((total, r) => total + r.count, 0),
        remaining: fromCents(status.remainingCents),
        percentUsed: status.percentUsed,
        thresholdReached: status.thresholdReached,
        state: status.state,
      };
    }),
  });
});

router.post("/", async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error); return; }
  const userId = req.userId!;
  const body = parsed.data;
  const workspaceId = body.workspaceId ?? null;
  const access = await scopeAccess(workspaceId, userId, true);
  if (access !== "ok") {
    res.status(403).json({ error: "Forbidden", message: access === "read_only" ? "Workspace owner or admin role required" : "Workspace membership required" });
    return;
  }
  const projectId = body.projectId ?? null;
  if (projectId !== null && !(await projectInScope(projectId, workspaceId, userId))) {
    res.status(400).json({ error: "Bad Request", message: "projectId: the project must belong to the budget's scope" });
    return;
  }
  try {
    const [created] = await db.insert(spendBudgetsTable).values({
      userId, workspaceId, projectId, name: body.name, currency: body.currency,
      amount: fromCents(toCents(body.amount)), thresholds: body.thresholds ?? DEFAULT_THRESHOLDS,
    }).returning();
    res.status(201).json(serialize((await findVisible(created.id, userId))!));
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    res.status(409).json({ error: "Conflict", message: `A ${body.currency} budget already exists for this ${projectId === null ? "scope" : "project"}` });
  }
});

/** Loads a budget the caller can see and checks write access; sends the error response otherwise. */
async function writable(req: import("express").Request, res: import("express").Response): Promise<BudgetRow | null> {
  const id = IdParam.safeParse(req.params);
  if (!id.success) { res.status(404).json({ error: "Not found" }); return null; }
  const budget = await findVisible(id.data.id, req.userId!);
  if (!budget) { res.status(404).json({ error: "Not found" }); return null; }
  if (await scopeAccess(budget.workspaceId, req.userId!, true) !== "ok") {
    res.status(403).json({ error: "Forbidden", message: "Workspace owner or admin role required" });
    return null;
  }
  return budget;
}

router.patch("/:id", async (req, res) => {
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error); return; }
  const budget = await writable(req, res);
  if (!budget) return;
  const patch = parsed.data;
  // Re-check write access in the statement itself, so a role revoked meanwhile cannot write.
  const [updated] = await db.update(spendBudgetsTable).set({
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.amount !== undefined ? { amount: fromCents(toCents(patch.amount)) } : {}),
    ...(patch.thresholds !== undefined ? { thresholds: patch.thresholds } : {}),
    updatedAt: new Date(),
  }).where(and(eq(spendBudgetsTable.id, budget.id), resourceScope(spendBudgetsTable, req.userId!, true))).returning({ id: spendBudgetsTable.id });
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize((await findVisible(budget.id, req.userId!))!));
});

router.delete("/:id", async (req, res) => {
  const budget = await writable(req, res);
  if (!budget) return;
  const deleted = await db.delete(spendBudgetsTable)
    .where(and(eq(spendBudgetsTable.id, budget.id), resourceScope(spendBudgetsTable, req.userId!, true)))
    .returning({ id: spendBudgetsTable.id });
  if (deleted.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

export default router;
