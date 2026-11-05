import { Router } from "express";
import {
  db,
  expensesTable,
  platformsTable,
  projectsTable,
  workspaceMembersTable,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import {
  CreateExpenseBody,
  UpdateExpenseBody,
  GetExpenseParams,
  UpdateExpenseParams,
  DeleteExpenseParams,
} from "@workspace/api-zod";
import { getWorkspaceMember } from "../middlewares/authz";
import { resourceScope } from "../lib/resource-scope";
import { expenseFieldIssue, normalizeExpenseInput } from "../lib/money";
import { z } from "zod";
import { ExpenseSearchQuery, searchFilters } from "../lib/expense-search";
import { filterConditions, fromCents, projectJoin, scopeCondition, toCents, vendorJoin } from "../lib/spend";

const ImportBatchBody = z.object({
  transactions: z.array(z.any()).min(1).max(500),
});

const router = Router();
const WRITE_ROLES = new Set(["owner", "admin"]);

async function memberWorkspaceIds(userId: string): Promise<number[]> {
  const memberships = await db
    .select({ workspaceId: workspaceMembersTable.workspaceId })
    .from(workspaceMembersTable)
    .where(and(eq(workspaceMembersTable.userId, userId), eq(workspaceMembersTable.status, "active")));
  return memberships.map((membership) => membership.workspaceId);
}

function visibleExpensesFilter(userId: string, workspaceIds: number[]) {
  const filters = [and(isNull(expensesTable.workspaceId), eq(expensesTable.userId, userId))];
  if (workspaceIds.length > 0) {
    filters.push(inArray(expensesTable.workspaceId, workspaceIds));
  }
  return or(...filters)!;
}

async function authorizeExpense(
  expense: { userId: string; workspaceId: number | null },
  userId: string,
  write: boolean,
): Promise<"allowed" | "not_found" | "read_only"> {
  if (expense.workspaceId === null) {
    return expense.userId === userId ? "allowed" : "not_found";
  }
  const membership = await getWorkspaceMember(expense.workspaceId, userId);
  if (!membership) return "not_found";
  return !write || WRITE_ROLES.has(membership.role) ? "allowed" : "read_only";
}

async function validateReferences(
  data: { platformId?: number | null; projectId?: number | null },
  userId: string,
  workspaceId: number | null,
): Promise<boolean> {
  if (data.platformId != null) {
    const platformScope = workspaceId === null
      ? and(eq(platformsTable.userId, userId), isNull(platformsTable.workspaceId))
      : eq(platformsTable.workspaceId, workspaceId);
    const [platform] = await db
      .select({ id: platformsTable.id })
      .from(platformsTable)
      .where(and(eq(platformsTable.id, data.platformId), platformScope));
    if (!platform) return false;
  }
  if (data.projectId != null) {
    const projectScope = workspaceId === null
      ? and(eq(projectsTable.userId, userId), isNull(projectsTable.workspaceId))
      : eq(projectsTable.workspaceId, workspaceId);
    const [project] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(and(eq(projectsTable.id, data.projectId), projectScope));
    if (!project) return false;
  }
  return true;
}

async function getPlatformName(platformId: number | null | undefined, userId: string, workspaceId: number | null) {
  if (platformId == null) return null;
  const scope = workspaceId === null
    ? and(eq(platformsTable.userId, userId), isNull(platformsTable.workspaceId))
    : eq(platformsTable.workspaceId, workspaceId);
  const [platform] = await db
    .select({ name: platformsTable.name })
    .from(platformsTable)
    .where(and(eq(platformsTable.id, platformId), scope));
  return platform?.name ?? null;
}

async function getProjectName(projectId: number | null | undefined, userId: string, workspaceId: number | null) {
  if (projectId == null) return null;
  const scope = workspaceId === null
    ? and(eq(projectsTable.userId, userId), isNull(projectsTable.workspaceId))
    : eq(projectsTable.workspaceId, workspaceId);
  const [project] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), scope));
  return project?.name ?? null;
}

router.get("/", async (req, res) => {
  const workspaceIds = await memberWorkspaceIds(req.userId!);
  const expenses = await db
    .select({
      id: expensesTable.id,
      workspaceId: expensesTable.workspaceId,
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
    .leftJoin(platformsTable, and(
      eq(expensesTable.platformId, platformsTable.id),
      or(
        and(isNull(expensesTable.workspaceId), isNull(platformsTable.workspaceId), eq(expensesTable.userId, platformsTable.userId)),
        and(isNotNull(expensesTable.workspaceId), eq(expensesTable.workspaceId, platformsTable.workspaceId)),
      ),
    ))
    .leftJoin(projectsTable, and(
      eq(expensesTable.projectId, projectsTable.id),
      or(
        and(isNull(expensesTable.workspaceId), isNull(projectsTable.workspaceId), eq(expensesTable.userId, projectsTable.userId)),
        and(isNotNull(expensesTable.workspaceId), eq(expensesTable.workspaceId, projectsTable.workspaceId)),
      ),
    ))
    .where(visibleExpensesFilter(req.userId!, workspaceIds))
    .orderBy(expensesTable.date);
  res.json(expenses.map((expense) => ({
    ...expense,
    amount: Number(expense.amount),
    createdAt: expense.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const body = CreateExpenseBody.parse(normalizeExpenseInput(req.body));
  const fieldIssue = expenseFieldIssue(body);
  if (fieldIssue) { res.status(400).json({ error: fieldIssue }); return; }
  const workspaceId = body.workspaceId ?? null;
  if (workspaceId !== null) {
    const membership = await getWorkspaceMember(workspaceId, req.userId!);
    if (!membership) {
      res.status(403).json({ error: "Workspace membership required" });
      return;
    }
    if (!WRITE_ROLES.has(membership.role)) {
      res.status(403).json({ error: "Workspace role cannot create expenses" });
      return;
    }
  }
  if (!(await validateReferences(body, req.userId!, workspaceId))) {
    res.status(400).json({ error: "Platform and project must belong to the selected scope" });
    return;
  }
  const [expense] = await db.insert(expensesTable).values({
    ...body,
    userId: req.userId!,
    workspaceId,
    amount: String(body.amount),
  }).returning();
  const platformName = await getPlatformName(body.platformId, req.userId!, workspaceId);
  const projectName = await getProjectName(body.projectId, req.userId!, workspaceId);
  const { userId: _userId, ...response } = expense;
  res.status(201).json({
    ...response,
    amount: Number(expense.amount),
    platformName,
    projectName,
    createdAt: expense.createdAt.toISOString(),
  });
});

// Server-side search over one scope (Personal or one workspace), with the same filters and
// money semantics as the dashboard summary and exports.
router.get("/search", async (req, res) => {
  const parsed = ExpenseSearchQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues.map(i => `${i.path.join(".") || "query"}: ${i.message}`).join("; ") });
    return;
  }
  const userId = req.userId!;
  const { workspaceId = null, sort, limit, offset } = parsed.data;
  if (workspaceId !== null && !(await getWorkspaceMember(workspaceId, userId))) {
    res.status(403).json({ error: "Forbidden", message: "Workspace membership required" });
    return;
  }
  const where = and(scopeCondition({ userId, workspaceId }), ...filterConditions(searchFilters(parsed.data)));
  const order = {
    date_desc: [desc(expensesTable.date), desc(expensesTable.id)],
    date_asc: [asc(expensesTable.date), asc(expensesTable.id)],
    amount_desc: [desc(expensesTable.amount), desc(expensesTable.id)],
    amount_asc: [asc(expensesTable.amount), asc(expensesTable.id)],
  }[sort];
  const [items, totals] = await Promise.all([
    db.select({
      id: expensesTable.id,
      workspaceId: expensesTable.workspaceId,
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
    }).from(expensesTable)
      .leftJoin(platformsTable, vendorJoin).leftJoin(projectsTable, projectJoin)
      .where(where).orderBy(...order).limit(limit).offset(offset),
    db.select({
      currency: expensesTable.currency,
      net: sql<string>`sum(${expensesTable.amount})::numeric(20,2)::text`,
      count: sql<number>`count(*)::int`,
    }).from(expensesTable)
      .leftJoin(platformsTable, vendorJoin).leftJoin(projectsTable, projectJoin)
      .where(where).groupBy(expensesTable.currency).orderBy(expensesTable.currency),
  ]);
  res.json({
    items: items.map(e => ({ ...e, amount: Number(e.amount), createdAt: e.createdAt.toISOString() })),
    total: totals.reduce((n, t) => n + t.count, 0),
    limit,
    offset,
    totals: totals.map(t => ({ currency: t.currency, net: fromCents(toCents(t.net)), count: t.count })),
  });
});

router.get("/:id", async (req, res) => {
  const { id } = GetExpenseParams.parse({ id: Number(req.params.id) });
  const [expense] = await db
    .select({
      id: expensesTable.id,
      userId: expensesTable.userId,
      workspaceId: expensesTable.workspaceId,
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
    .leftJoin(platformsTable, and(
      eq(expensesTable.platformId, platformsTable.id),
      or(
        and(isNull(expensesTable.workspaceId), isNull(platformsTable.workspaceId), eq(expensesTable.userId, platformsTable.userId)),
        and(isNotNull(expensesTable.workspaceId), eq(expensesTable.workspaceId, platformsTable.workspaceId)),
      ),
    ))
    .leftJoin(projectsTable, and(
      eq(expensesTable.projectId, projectsTable.id),
      or(
        and(isNull(expensesTable.workspaceId), isNull(projectsTable.workspaceId), eq(expensesTable.userId, projectsTable.userId)),
        and(isNotNull(expensesTable.workspaceId), eq(expensesTable.workspaceId, projectsTable.workspaceId)),
      ),
    ))
    .where(eq(expensesTable.id, id));
  if (!expense || await authorizeExpense(expense, req.userId!, false) !== "allowed") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { userId: _userId, ...response } = expense;
  res.json({ ...response, amount: Number(expense.amount), createdAt: expense.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateExpenseParams.parse({ id: Number(req.params.id) });
  const body = UpdateExpenseBody.parse(normalizeExpenseInput(req.body));
  const fieldIssue = expenseFieldIssue(body);
  if (fieldIssue) { res.status(400).json({ error: fieldIssue }); return; }
  const [existing] = await db.select().from(expensesTable).where(eq(expensesTable.id, id));
  const authorization = existing && await authorizeExpense(existing, req.userId!, true);
  if (!existing || authorization === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (authorization === "read_only") {
    res.status(403).json({ error: "Workspace role cannot update expenses" });
    return;
  }
  if (!(await validateReferences(body, req.userId!, existing.workspaceId))) {
    res.status(400).json({ error: "Platform and project must belong to the expense scope" });
    return;
  }
  const updateData: Record<string, unknown> = { ...body };
  if (body.amount !== undefined) updateData.amount = String(body.amount);
  const [expense] = await db
    .update(expensesTable)
    .set(updateData)
    .where(and(eq(expensesTable.id, id), resourceScope(expensesTable, req.userId!, true)))
    .returning();
  if (!expense) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const platformName = await getPlatformName(expense.platformId, req.userId!, expense.workspaceId);
  const projectName = await getProjectName(expense.projectId, req.userId!, expense.workspaceId);
  const { userId: _userId, ...response } = expense;
  res.json({
    ...response,
    amount: Number(expense.amount),
    platformName,
    projectName,
    createdAt: expense.createdAt.toISOString(),
  });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteExpenseParams.parse({ id: Number(req.params.id) });
  const [existing] = await db.select().from(expensesTable).where(eq(expensesTable.id, id));
  const authorization = existing && await authorizeExpense(existing, req.userId!, true);
  if (!existing || authorization === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (authorization === "read_only") {
    res.status(403).json({ error: "Workspace role cannot delete expenses" });
    return;
  }
  const deleted = await db.delete(expensesTable)
    .where(and(eq(expensesTable.id, id), resourceScope(expensesTable, req.userId!, true)))
    .returning({ id: expensesTable.id });
  // Access can be revoked between the check above and the delete; never report success for a no-op.
  if (deleted.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

router.post("/import-batch", async (req, res) => {
  const { transactions } = ImportBatchBody.parse(req.body);
  const formatted = [];
  // Request-scoped caches: a 500-row import repeats the same few membership and
  // reference checks. Every row is still checked; results are reused only within
  // this request, so authorization semantics are unchanged.
  const canWrite = new Map<number, Promise<boolean>>();
  const referencesOk = new Map<string, Promise<boolean>>();
  for (const transaction of transactions) {
    const parsed = CreateExpenseBody.parse(normalizeExpenseInput(transaction));
    const fieldIssue = expenseFieldIssue(parsed);
    if (fieldIssue) { res.status(400).json({ error: fieldIssue }); return; }
    const workspaceId = parsed.workspaceId ?? null;
    if (workspaceId !== null) {
      if (!canWrite.has(workspaceId)) {
        canWrite.set(workspaceId, getWorkspaceMember(workspaceId, req.userId!)
          .then(membership => !!membership && WRITE_ROLES.has(membership.role)));
      }
      if (!(await canWrite.get(workspaceId))) {
        res.status(403).json({ error: "Workspace membership and write role required" });
        return;
      }
    }
    const referenceKey = `${workspaceId}|${parsed.platformId ?? ""}|${parsed.projectId ?? ""}`;
    if (!referencesOk.has(referenceKey)) {
      referencesOk.set(referenceKey, validateReferences(parsed, req.userId!, workspaceId));
    }
    if (!(await referencesOk.get(referenceKey))) {
      res.status(400).json({ error: "Platform and project must belong to the selected scope" });
      return;
    }
    formatted.push({
      ...parsed,
      userId: req.userId!,
      workspaceId,
      amount: String(parsed.amount),
    });
  }
  const inserted = await db.insert(expensesTable).values(formatted).returning();
  res.status(201).json({ count: inserted.length });
});

export default router;
