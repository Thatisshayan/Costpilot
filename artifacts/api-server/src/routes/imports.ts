// CSV import (Batch 3B): preview, import, list and undo. Every row is validated on the server;
// rows are attributed (source = "import", import batch, external id) and imported atomically.
// Owners/admins import into a workspace; anyone imports into their own Personal scope.
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, expensesTable, importBatchesTable, platformsTable, projectsTable, type ImportBatch } from "@workspace/db";
import { getWorkspaceMember } from "../middlewares/authz";
import { resourceScope } from "../lib/resource-scope";
import { fromCents, scopeCondition, toCents } from "../lib/spend";
import { checkRowFields, ImportRequest, matchKey, type CleanRow, type RowResult } from "../lib/csv-import";

const router = Router();
const WRITE_ROLES = new Set(["owner", "admin"]);

type Scope = { userId: string; workspaceId: number | null };
/** The shared pool or an open transaction; analysis runs inside the import transaction. */
type Executor = Pick<typeof db, "select">;
type Resolved = CleanRow & { platformId: number | null; projectId: number | null };

function badRequest(res: Response, error: z.ZodError) {
  res.status(400).json({ error: "Bad Request", message: error.issues.map(i => (i.path.length ? `${i.path.join(".")}: ` : "") + i.message).slice(0, 5).join("; ") });
}

async function canWrite(scope: Scope): Promise<"ok" | "forbidden" | "read_only"> {
  if (scope.workspaceId === null) return "ok";
  const member = await getWorkspaceMember(scope.workspaceId, scope.userId);
  if (!member) return "forbidden";
  return WRITE_ROLES.has(member.role) ? "ok" : "read_only";
}

/** Lower-cased name -> ids of the vendors/projects in exactly this scope. */
async function namesInScope(ex: Executor, scope: Scope) {
  const platformScope = scope.workspaceId === null
    ? and(isNull(platformsTable.workspaceId), eq(platformsTable.userId, scope.userId))
    : eq(platformsTable.workspaceId, scope.workspaceId);
  const projectScope = scope.workspaceId === null
    ? and(isNull(projectsTable.workspaceId), eq(projectsTable.userId, scope.userId))
    : eq(projectsTable.workspaceId, scope.workspaceId);
  const [vendors, projects] = await Promise.all([
    ex.select({ id: platformsTable.id, name: platformsTable.name }).from(platformsTable).where(platformScope),
    ex.select({ id: projectsTable.id, name: projectsTable.name }).from(projectsTable).where(projectScope),
  ]);
  const index = (rows: { id: number; name: string }[]) => {
    const map = new Map<string, number[]>();
    for (const r of rows) {
      const key = r.name.trim().toLowerCase();
      map.set(key, [...(map.get(key) ?? []), r.id]);
    }
    return map;
  };
  return { vendors: index(vendors), projects: index(projects) };
}

/**
 * Validates every row against the fields, the scope's vendors/projects, earlier rows in the
 * file and the scope's existing expenses. Returns the per-row report and the rows to insert.
 */
async function analyze(ex: Executor, scope: Scope, input: z.infer<typeof ImportRequest>) {
  const confirmed = new Set(input.confirmDuplicateRows ?? []);
  const names = await namesInScope(ex, scope);
  const results: RowResult[] = [];
  const candidates: Resolved[] = [];

  for (const raw of input.rows) {
    const checked = checkRowFields(raw);
    if ("messages" in checked) { results.push({ rowNumber: raw.rowNumber, status: "invalid", messages: checked.messages }); continue; }
    const row = checked.row;
    const messages: string[] = [];
    const resolve = (name: string | undefined, map: Map<string, number[]>, kind: "Vendor" | "Project", page: string) => {
      if (!name) return null;
      const ids = map.get(name.toLowerCase()) ?? [];
      if (ids.length === 1) return ids[0];
      messages.push(ids.length === 0
        ? `${kind} "${name}" does not exist in this scope. Add it on the ${page} page or leave the column empty.`
        : `${kind} "${name}" matches more than one ${kind.toLowerCase()} in this scope; rename one first.`);
      return null;
    };
    const platformId = resolve(row.vendor, names.vendors, "Vendor", "Vendors");
    const projectId = resolve(row.project, names.projects, "Project", "Projects");
    if (messages.length > 0) { results.push({ rowNumber: row.rowNumber, status: "invalid", messages }); continue; }
    candidates.push({ ...row, platformId, projectId });
    results.push({ rowNumber: row.rowNumber, status: "valid", messages: [] });
  }

  const byRow = new Map(results.map(r => [r.rowNumber, r]));
  const where = scopeCondition(scope);
  const externalIds = [...new Set(candidates.map(c => c.externalId).filter((v): v is string => Boolean(v)))];
  const dates = [...new Set(candidates.map(c => c.date))];
  const [imported, existing] = await Promise.all([
    externalIds.length === 0 ? [] : ex.select({ externalId: expensesTable.externalId }).from(expensesTable)
      .where(and(where, eq(expensesTable.source, "import"), inArray(expensesTable.externalId, externalIds))),
    dates.length === 0 ? [] : ex.select({
      date: expensesTable.date, amount: sql<string>`${expensesTable.amount}::text`, currency: expensesTable.currency,
      platformId: expensesTable.platformId, projectId: expensesTable.projectId, description: expensesTable.description,
    }).from(expensesTable).where(and(where, inArray(expensesTable.date, dates))),
  ]);
  const importedIds = new Set(imported.map(r => r.externalId));
  const existingKeys = new Set(existing.map(e => matchKey({ ...e, amountCents: toCents(e.amount) })));

  const seenExternal = new Map<string, number>();
  const seenKeys = new Map<string, number>();
  const insert: Resolved[] = [];
  for (const c of candidates) {
    const result = byRow.get(c.rowNumber)!;
    if (c.externalId) {
      const earlier = seenExternal.get(c.externalId);
      if (earlier !== undefined) {
        result.status = "invalid";
        result.messages.push(`External ID "${c.externalId}" is repeated from row ${earlier}.`);
        continue;
      }
      seenExternal.set(c.externalId, c.rowNumber);
      if (importedIds.has(c.externalId)) {
        result.status = "already_imported";
        result.messages.push(`External ID "${c.externalId}" was already imported into this scope; skipped.`);
        continue;
      }
    }
    const key = matchKey(c);
    const earlierRow = seenKeys.get(key);
    if (!seenKeys.has(key)) seenKeys.set(key, c.rowNumber);
    if (existingKeys.has(key) || earlierRow !== undefined) {
      result.status = "possible_duplicate";
      result.messages.push(existingKeys.has(key)
        ? "An expense with the same date, amount, currency, vendor, project and description already exists."
        : `Looks the same as row ${earlierRow}.`);
      if (!confirmed.has(c.rowNumber)) continue;
      result.messages.push("Confirmed: will be imported.");
    }
    insert.push(c);
  }
  const counts = { valid: 0, invalid: 0, already_imported: 0, possible_duplicate: 0 };
  for (const r of results) counts[r.status]++;
  return { rows: results.sort((a, b) => a.rowNumber - b.rowNumber), counts, insert };
}

function serializeBatch(b: ImportBatch) {
  return {
    id: b.id, workspaceId: b.workspaceId, fileName: b.fileName, rowCount: b.rowCount, insertedCount: b.insertedCount,
    skippedCount: b.skippedCount, createdAt: b.createdAt.toISOString(), undoneAt: b.undoneAt?.toISOString() ?? null,
  };
}

async function authorizedScope(req: Request, res: Response, workspaceId: number | null): Promise<Scope | null> {
  const scope = { userId: req.userId!, workspaceId };
  const access = await canWrite(scope);
  if (access !== "ok") {
    res.status(403).json({ error: "Forbidden", message: access === "read_only" ? "Workspace owner or admin role required to import" : "Workspace membership required" });
    return null;
  }
  return scope;
}

router.post("/preview", async (req, res) => {
  const parsed = ImportRequest.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error); return; }
  const scope = await authorizedScope(req, res, parsed.data.workspaceId ?? null);
  if (!scope) return;
  const { rows, counts, insert } = await analyze(db, scope, parsed.data);
  res.json({ rows, counts, importableCount: insert.length });
});

router.post("/", async (req, res) => {
  const parsed = ImportRequest.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error); return; }
  const scope = await authorizedScope(req, res, parsed.data.workspaceId ?? null);
  if (!scope) return;
  // All or nothing, and one import per scope at a time: the scope lock makes a concurrent
  // import of the same file (with or without transaction IDs) see this one's rows, so
  // look-alikes still need confirmation and nothing is duplicated.
  const outcome = await db.transaction(async tx => {
    const lockKey = scope.workspaceId === null ? `import:user:${scope.userId}` : `import:workspace:${scope.workspaceId}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
    const analysis = await analyze(tx, scope, parsed.data);
    if (analysis.insert.length === 0) return { analysis, batch: null };
    const [created] = await tx.insert(importBatchesTable).values({
      userId: scope.userId, workspaceId: scope.workspaceId, fileName: parsed.data.fileName,
      rowCount: parsed.data.rows.length, insertedCount: 0, skippedCount: 0,
    }).returning();
    // The unique external-id index stays as a backstop (for example the legacy import-batch route).
    const inserted = await tx.insert(expensesTable).values(analysis.insert.map(r => ({
      userId: scope.userId, workspaceId: scope.workspaceId, platformId: r.platformId, projectId: r.projectId,
      amount: fromCents(r.amountCents), currency: r.currency, date: r.date, description: r.description ?? null,
      category: r.category ?? null, source: "import", externalId: r.externalId ?? null, importBatchId: created.id,
    }))).onConflictDoNothing().returning({ externalId: expensesTable.externalId });
    if (inserted.length < analysis.insert.length) {
      // Report rows that lost to a concurrent write instead of calling them imported.
      const landed = new Set(inserted.map(r => r.externalId).filter(Boolean));
      for (const row of analysis.insert) {
        if (!row.externalId || landed.has(row.externalId)) continue;
        const result = analysis.rows.find(r => r.rowNumber === row.rowNumber)!;
        analysis.counts[result.status]--;
        result.status = "already_imported";
        result.messages.push(`External ID "${row.externalId}" was imported by another request at the same time; skipped.`);
        analysis.counts.already_imported++;
      }
    }
    if (inserted.length === 0) throw new NothingImported(analysis);
    const [final] = await tx.update(importBatchesTable)
      .set({ insertedCount: inserted.length, skippedCount: parsed.data.rows.length - inserted.length })
      .where(eq(importBatchesTable.id, created.id)).returning();
    return { analysis, batch: final };
  }).catch(error => {
    if (error instanceof NothingImported) return { analysis: error.analysis, batch: null };
    throw error;
  });
  const { rows, counts } = outcome.analysis;
  if (!outcome.batch) {
    res.json({ batch: null, insertedCount: 0, skippedCount: parsed.data.rows.length, rows, counts });
    return;
  }
  const batch = outcome.batch;
  res.status(201).json({ batch: serializeBatch(batch), insertedCount: batch.insertedCount, skippedCount: batch.skippedCount, rows, counts });
});

/** Rolls back an empty batch record when every row lost a race. */
class NothingImported extends Error {
  constructor(readonly analysis: Awaited<ReturnType<typeof analyze>>) { super("nothing imported"); }
}

const ListQuery = z.object({ workspaceId: z.coerce.number().int().positive().optional() }).strict();

router.get("/", async (req, res) => {
  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) { badRequest(res, parsed.error); return; }
  const workspaceId = parsed.data.workspaceId ?? null;
  if (workspaceId !== null && !(await getWorkspaceMember(workspaceId, req.userId!))) {
    res.status(403).json({ error: "Forbidden", message: "Workspace membership required" });
    return;
  }
  const scope = workspaceId === null
    ? and(isNull(importBatchesTable.workspaceId), eq(importBatchesTable.userId, req.userId!))
    : eq(importBatchesTable.workspaceId, workspaceId);
  const batches = await db.select().from(importBatchesTable).where(scope).orderBy(desc(importBatchesTable.createdAt), desc(importBatchesTable.id)).limit(50);
  res.json(batches.map(serializeBatch));
});

router.delete("/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!id.success) { res.status(404).json({ error: "Not found" }); return; }
  const [batch] = await db.select().from(importBatchesTable)
    .where(and(eq(importBatchesTable.id, id.data), resourceScope(importBatchesTable, req.userId!)));
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }
  if (!(await authorizedScope(req, res, batch.workspaceId))) return;
  const result = await db.transaction(async tx => {
    // Claim the batch first so two undo requests cannot both run.
    const [claimed] = await tx.update(importBatchesTable).set({ undoneAt: new Date() })
      .where(and(eq(importBatchesTable.id, batch.id), isNull(importBatchesTable.undoneAt), resourceScope(importBatchesTable, req.userId!, true)))
      .returning({ id: importBatchesTable.id });
    if (!claimed) return null;
    const deleted = await tx.delete(expensesTable)
      .where(and(eq(expensesTable.importBatchId, batch.id), scopeCondition({ userId: batch.userId, workspaceId: batch.workspaceId })))
      .returning({ id: expensesTable.id });
    return deleted.length;
  });
  if (result === null) { res.status(409).json({ error: "Conflict", message: "This import was already undone" }); return; }
  res.json({ deletedCount: result });
});

export default router;
