// Recurring plans (Step C). Replaces the earlier unscoped, unvalidated route.
//
// Rules:
// - A plan belongs to one scope: Personal (only its owner) or one workspace (active members
//   read; owners and admins write). A linked vendor or project must be in the same scope.
// - Active, auto-recorded plans become expenses on each renewal (lib/subscription-renewals),
//   including renewal dates in the past, so a plan can be backfilled from its first charge.
import { Router, type Response } from "express";
import { z } from "zod";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, platformsTable, projectsTable, subscriptionsTable, type Subscription } from "@workspace/db";
import { getWorkspaceMember } from "../middlewares/authz";
import { resourceScope } from "../lib/resource-scope";
import { fromCents, toCents } from "../lib/spend";
import { BILLING_CYCLES, monthlyEquivalentCents, recordDueRenewals, type BillingCycle } from "../lib/subscription-renewals";

const router = Router();
const WRITE_ROLES = new Set(["owner", "admin"]);
const PG_INT_MAX = 2147483647;
const STATUSES = ["active", "trial", "paused", "cancelled"] as const;

const AMOUNT = /^\d{1,8}(\.\d{1,2})?$/;
const id = z.number().int().positive().max(PG_INT_MAX);
const day = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "dates must be YYYY-MM-DD")
  .refine(v => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), "not a calendar date");
const text = (max: number) => z.string().trim().max(max).refine(v => !v.includes("\u0000"), "contains an invalid character");
const Fields = {
  platformId: id.nullable().optional(),
  projectId: id.nullable().optional(),
  name: text(120).pipe(z.string().min(1, "name is required")),
  amount: z.string().regex(AMOUNT, "amount must be a number with at most 2 decimals"),
  currency: z.string().regex(/^[A-Z]{3}$/, "currency must be a 3-letter ISO 4217 code"),
  billingCycle: z.enum(BILLING_CYCLES as [BillingCycle, ...BillingCycle[]]),
  status: z.enum(STATUSES),
  nextRenewalDate: day.nullable().optional(),
  trialEndDate: day.nullable().optional(),
  autoRecord: z.boolean().optional(),
  notes: text(1000).nullable().optional(),
};
const CreateBody = z.object({
  ...Fields,
  workspaceId: id.nullable().optional(),
  status: Fields.status.default("active"),
}).strict();
const UpdateBody = z.object({
  ...Fields,
  name: Fields.name.optional(), amount: Fields.amount.optional(), currency: Fields.currency.optional(),
  billingCycle: Fields.billingCycle.optional(), status: Fields.status.optional(),
}).strict();
const ScopeQuery = z.object({ workspaceId: z.coerce.number().int().positive().max(PG_INT_MAX).optional() }).strict();
const IdParam = z.object({ id: z.coerce.number().int().positive().max(PG_INT_MAX) });

function badRequest(res: Response, message: string) {
  res.status(400).json({ error: "Bad Request", message });
}
const zodMessage = (error: z.ZodError) => error.issues.map(i => (i.path.length ? `${i.path.join(".")}: ` : "") + i.message).join("; ");

async function scopeAccess(workspaceId: number | null, userId: string, write: boolean): Promise<"ok" | "forbidden" | "read_only"> {
  if (workspaceId === null) return "ok";
  const member = await getWorkspaceMember(workspaceId, userId);
  if (!member) return "forbidden";
  return !write || WRITE_ROLES.has(member.role) ? "ok" : "read_only";
}

function inScope(table: typeof platformsTable | typeof projectsTable, workspaceId: number | null, userId: string) {
  return workspaceId === null ? and(isNull(table.workspaceId), eq(table.userId, userId)) : eq(table.workspaceId, workspaceId);
}

/** Why a linked vendor or project is not usable from this scope, or null. */
async function linkIssue(body: { platformId?: number | null; projectId?: number | null }, workspaceId: number | null, userId: string) {
  if (body.platformId) {
    const [p] = await db.select({ id: platformsTable.id }).from(platformsTable)
      .where(and(eq(platformsTable.id, body.platformId), inScope(platformsTable, workspaceId, userId)));
    if (!p) return "platformId must be a vendor in the same scope";
  }
  if (body.projectId) {
    const [p] = await db.select({ id: projectsTable.id }).from(projectsTable)
      .where(and(eq(projectsTable.id, body.projectId), inScope(projectsTable, workspaceId, userId)));
    if (!p) return "projectId must be a project in the same scope";
  }
  return null;
}

/** An active plan needs a renewal date to be recorded; a trial needs its end date. */
function datesIssue(s: { status: string; nextRenewalDate?: string | null; trialEndDate?: string | null }) {
  if (s.status === "active" && !s.nextRenewalDate) return "nextRenewalDate is required for an active plan";
  if (s.status === "trial" && !s.trialEndDate) return "trialEndDate is required for a trial";
  return null;
}

const anchorOf = (cycle: string, next: string | null | undefined) => (cycle === "weekly" || !next ? null : Number(next.slice(8, 10)));

type Row = Subscription & { platformName: string | null; projectName: string | null };

function serialize(s: Row) {
  const amount = s.amount ?? "0";
  return {
    id: s.id, workspaceId: s.workspaceId, platformId: s.platformId, platformName: s.platformName,
    projectId: s.projectId, projectName: s.projectName, name: s.name,
    amount: fromCents(toCents(amount)), currency: s.currency, billingCycle: s.billingCycle,
    monthlyEquivalent: fromCents(monthlyEquivalentCents(toCents(amount), s.billingCycle as BillingCycle)),
    status: s.status, nextRenewalDate: s.nextRenewalDate, trialEndDate: s.trialEndDate,
    autoRecord: s.autoRecord, lastRecordedDate: s.lastRecordedDate, notes: s.notes,
    createdAt: s.createdAt.toISOString(),
  };
}

const withNames = () => db.select({ sub: subscriptionsTable, platformName: platformsTable.name, projectName: projectsTable.name })
  .from(subscriptionsTable)
  .leftJoin(platformsTable, eq(subscriptionsTable.platformId, platformsTable.id))
  .leftJoin(projectsTable, eq(subscriptionsTable.projectId, projectsTable.id));
const toRow = (r: { sub: Subscription; platformName: string | null; projectName: string | null }): Row =>
  ({ ...r.sub, platformName: r.platformName ?? null, projectName: r.projectName ?? null });

async function findVisible(subscriptionId: number, userId: string, write = false): Promise<Row | undefined> {
  const [row] = await withNames().where(and(eq(subscriptionsTable.id, subscriptionId), resourceScope(subscriptionsTable, userId, write)));
  return row ? toRow(row) : undefined;
}

router.get("/", async (req, res) => {
  const parsed = ScopeQuery.safeParse(req.query);
  if (!parsed.success) { badRequest(res, zodMessage(parsed.error)); return; }
  const workspaceId = parsed.data.workspaceId ?? null;
  if (await scopeAccess(workspaceId, req.userId!, false) !== "ok") {
    res.status(403).json({ error: "Forbidden", message: "Workspace membership required" });
    return;
  }
  const scope = workspaceId === null
    ? and(isNull(subscriptionsTable.workspaceId), eq(subscriptionsTable.userId, req.userId!))
    : eq(subscriptionsTable.workspaceId, workspaceId);
  const rows = await withNames().where(scope).orderBy(asc(subscriptionsTable.nextRenewalDate), asc(subscriptionsTable.id));
  res.json(rows.map(toRow).map(serialize));
});

router.post("/", async (req, res) => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) { badRequest(res, zodMessage(parsed.error)); return; }
  const body = parsed.data;
  const userId = req.userId!;
  const workspaceId = body.workspaceId ?? null;
  const access = await scopeAccess(workspaceId, userId, true);
  if (access !== "ok") {
    res.status(403).json({ error: "Forbidden", message: access === "read_only" ? "Workspace write permission required" : "Workspace membership required" });
    return;
  }
  const issue = datesIssue(body) ?? await linkIssue(body, workspaceId, userId);
  if (issue) { badRequest(res, issue); return; }
  const [created] = await db.insert(subscriptionsTable).values({
    userId, workspaceId, platformId: body.platformId ?? null, projectId: body.projectId ?? null,
    name: body.name, amount: body.amount, currency: body.currency, billingCycle: body.billingCycle,
    status: body.status, nextRenewalDate: body.nextRenewalDate ?? null, trialEndDate: body.trialEndDate ?? null,
    billingAnchorDay: anchorOf(body.billingCycle, body.nextRenewalDate ?? body.trialEndDate),
    autoRecord: body.autoRecord ?? true, notes: body.notes ?? null,
  }).returning({ id: subscriptionsTable.id });
  await recordDueRenewals();
  res.status(201).json(serialize((await findVisible(created.id, userId))!));
});

router.patch("/:id", async (req, res) => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(404).json({ error: "Not found" }); return; }
  if (req.body?.workspaceId !== undefined) { badRequest(res, "Workspace assignment is immutable"); return; }
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) { badRequest(res, zodMessage(parsed.error)); return; }
  const userId = req.userId!;
  const current = await findVisible(params.data.id, userId, true);
  if (!current) { res.status(404).json({ error: "Not found" }); return; }
  const changes = parsed.data;
  if (Object.keys(changes).length === 0) { badRequest(res, "No fields to update"); return; }
  const merged = { ...current, ...changes };
  const issue = datesIssue(merged) ?? await linkIssue(changes, current.workspaceId, userId);
  if (issue) { badRequest(res, issue); return; }
  const reanchor = changes.nextRenewalDate !== undefined || changes.billingCycle !== undefined;
  await db.update(subscriptionsTable).set({
    ...changes,
    ...(reanchor ? { billingAnchorDay: anchorOf(merged.billingCycle, merged.nextRenewalDate ?? merged.trialEndDate) } : {}),
  }).where(eq(subscriptionsTable.id, current.id));
  await recordDueRenewals();
  res.json(serialize((await findVisible(current.id, userId))!));
});

router.delete("/:id", async (req, res) => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(404).json({ error: "Not found" }); return; }
  // Expenses already recorded for this plan stay: they were real charges.
  const [deleted] = await db.delete(subscriptionsTable)
    .where(and(eq(subscriptionsTable.id, params.data.id), resourceScope(subscriptionsTable, req.userId!, true)))
    .returning({ id: subscriptionsTable.id });
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).send();
});

export default router;
