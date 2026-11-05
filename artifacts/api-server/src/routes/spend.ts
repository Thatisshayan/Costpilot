import { Router } from "express";
import { z } from "zod";
import { and, gte, lte, sql } from "drizzle-orm";
import { db, expensesTable, platformsTable, projectsTable } from "@workspace/db";
import { getWorkspaceMember } from "../middlewares/authz";
import {
  comparisonPeriod, fromCents, monthPeriod, percentChange, projectJoin, scopeCondition,
  shiftMonth, toCents, vendorJoin, type Scope,
} from "../lib/spend";

const router = Router();

export const SummaryQuery = z.object({
  // Omitted: Personal scope. A workspace id requires active membership (any role).
  workspaceId: z.coerce.number().int().positive().optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM").optional(),
}).strict();

const TREND_MONTHS = 6;

/** The pool or a read transaction; the summary reads all run in one snapshot. */
type Executor = Pick<typeof db, "select">;

type GroupRow = { currency: string; key: number | string | null; name: string | null; net: string; count: number };

async function totalsByCurrency(ex: Executor, scope: Scope, from: string, through: string) {
  const rows = await ex.select({
    currency: expensesTable.currency,
    charges: sql<string>`coalesce(sum(${expensesTable.amount}) filter (where ${expensesTable.amount} >= 0), 0)::numeric(20,2)::text`,
    credits: sql<string>`coalesce(sum(${expensesTable.amount}) filter (where ${expensesTable.amount} < 0), 0)::numeric(20,2)::text`,
    count: sql<number>`count(*)::int`,
  }).from(expensesTable)
    .where(and(scopeCondition(scope), gte(expensesTable.date, from), lte(expensesTable.date, through)))
    .groupBy(expensesTable.currency);
  return new Map(rows.map(r => [r.currency, r]));
}

async function groupedNet(ex: Executor, scope: Scope, from: string, through: string, by: "vendor" | "project" | "category"): Promise<GroupRow[]> {
  const range = and(scopeCondition(scope), gte(expensesTable.date, from), lte(expensesTable.date, through));
  const net = sql<string>`sum(${expensesTable.amount})::numeric(20,2)::text`;
  const count = sql<number>`count(*)::int`;
  if (by === "vendor") {
    return ex.select({ currency: expensesTable.currency, key: platformsTable.id, name: platformsTable.name, net, count })
      .from(expensesTable).leftJoin(platformsTable, vendorJoin).where(range)
      .groupBy(expensesTable.currency, platformsTable.id, platformsTable.name);
  }
  if (by === "project") {
    return ex.select({ currency: expensesTable.currency, key: projectsTable.id, name: projectsTable.name, net, count })
      .from(expensesTable).leftJoin(projectsTable, projectJoin).where(range)
      .groupBy(expensesTable.currency, projectsTable.id, projectsTable.name);
  }
  // An empty-string category is grouped with uncategorised (NULL).
  const category = sql<string | null>`nullif(${expensesTable.category}, '')`;
  return ex.select({ currency: expensesTable.currency, key: category, name: category, net, count })
    .from(expensesTable).where(range).groupBy(expensesTable.currency, category);
}

/** Largest net first, then name, so ordering is deterministic. */
function breakdown(rows: GroupRow[], currency: string, idKey: "id" | "name") {
  return rows.filter(r => r.currency === currency)
    .sort((a, b) => {
      const diff = toCents(b.net) - toCents(a.net);
      return diff !== 0n ? (diff > 0n ? 1 : -1) : String(a.name ?? "").localeCompare(String(b.name ?? ""));
    })
    .map(r => (idKey === "id"
      ? { id: (r.key as number | null) ?? null, name: r.name ?? null, net: r.net, count: r.count }
      : { name: r.name ?? null, net: r.net, count: r.count }));
}

router.get("/summary", async (req, res) => {
  const parsed = SummaryQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues.map(i => i.message).join("; ") });
    return;
  }
  const userId = req.userId!;
  const workspaceId = parsed.data.workspaceId ?? null;
  if (workspaceId !== null && !(await getWorkspaceMember(workspaceId, userId))) {
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
  const comparison = comparisonPeriod(period);
  const scope: Scope = { userId, workspaceId };

  const trendStart = `${shiftMonth(period.month, -(TREND_MONTHS - 1))}-01`;
  // One read-only snapshot, so totals, breakdowns and trend agree even while expenses change.
  const [current, previous, vendors, projects, categories, trendRows] = await db.transaction(tx => Promise.all([
    totalsByCurrency(tx, scope, period.start, period.through),
    totalsByCurrency(tx, scope, comparison.start, comparison.through),
    groupedNet(tx, scope, period.start, period.through, "vendor"),
    groupedNet(tx, scope, period.start, period.through, "project"),
    groupedNet(tx, scope, period.start, period.through, "category"),
    tx.select({
      month: sql<string>`substring(${expensesTable.date}, 1, 7)`,
      currency: expensesTable.currency,
      net: sql<string>`sum(${expensesTable.amount})::numeric(20,2)::text`,
    }).from(expensesTable)
      .where(and(scopeCondition(scope), gte(expensesTable.date, trendStart), lte(expensesTable.date, period.through)))
      .groupBy(sql`substring(${expensesTable.date}, 1, 7)`, expensesTable.currency),
  ]), { isolationLevel: "repeatable read", accessMode: "read only" });

  const months = Array.from({ length: TREND_MONTHS }, (_, i) => shiftMonth(period.month, i - (TREND_MONTHS - 1)));
  const currencyCodes = [...new Set([...current.keys(), ...previous.keys(), ...trendRows.map(r => r.currency)])].sort();
  const currencies = currencyCodes.map(currency => {
    const now = current.get(currency);
    const before = previous.get(currency);
    const charges = toCents(now?.charges);
    const credits = toCents(now?.credits);
    const net = charges + credits;
    const previousNet = toCents(before?.charges) + toCents(before?.credits);
    return {
      currency,
      net: fromCents(net),
      charges: fromCents(charges),
      credits: fromCents(credits),
      count: now?.count ?? 0,
      previousNet: fromCents(previousNet),
      changeAmount: fromCents(net - previousNet),
      changePercent: percentChange(net, previousNet),
      byVendor: breakdown(vendors, currency, "id"),
      byProject: breakdown(projects, currency, "id"),
      byCategory: breakdown(categories, currency, "name"),
      trend: months.map(month => ({ month, net: trendRows.find(r => r.month === month && r.currency === currency)?.net ?? "0.00" })),
    };
  });

  res.json({ workspaceId, period, comparison, currencies });
});

export default router;
