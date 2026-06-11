import { Router } from "express";
import {
  db,
  expensesTable,
  platformsTable,
  subscriptionsTable,
  toolsTable,
  budgetPoliciesTable,
  remediationActionsTable,
  workspaceMembersTable,
} from "@workspace/db";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { calcDaysUntilExpiry, getDefaultWorkspaceId } from "./dashboard-utils";

const router = Router();

router.get("/summary", async (req, res) => {
  const userId = req.userId!;
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [totalSpendRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(eq(expensesTable.userId, userId));

  const [thisMonthRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(and(sql`${expensesTable.date} >= ${thisMonthStart}`, eq(expensesTable.userId, userId)));

  const [lastMonthRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(and(sql`${expensesTable.date} >= ${lastMonthStart} AND ${expensesTable.date} <= ${lastMonthEnd}`, eq(expensesTable.userId, userId)));

  const renewals = await db
    .select({ cost: subscriptionsTable.monthlyCost })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.status, "active"),
        isNotNull(subscriptionsTable.renewalDate),
        sql`${subscriptionsTable.renewalDate} >= ${today} AND ${subscriptionsTable.renewalDate} <= ${sevenDaysFromNow}`,
        eq(subscriptionsTable.userId, userId)
      )
    );

  const renewalsCount = renewals.length;
  const renewalsTotal = renewals.reduce((acc, r) => acc + Number(r.cost || 0), 0);

  const [activeToolsRow] = await db
    .select({ count: sql<string>`COUNT(DISTINCT ${expensesTable.platformId})` })
    .from(expensesTable)
    .where(eq(expensesTable.userId, userId));

  const thisMonthTotal = Number(thisMonthRow.total);
  const lastMonthTotal = Number(lastMonthRow.total);
  const changePercent = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  const [unusedToolsRow] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(toolsTable)
    .where(
      and(
        eq(toolsTable.userId, userId),
        sql`NOT EXISTS (
          SELECT 1 FROM ${expensesTable} e 
          WHERE e.platform_id = ${toolsTable.platformId} 
          AND e.date >= ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
        )`
      )
    );

  const [budgetPolicy] = await db
    .select({ threshold: budgetPoliciesTable.thresholdAmount })
    .from(budgetPoliciesTable)
    .where(eq(budgetPoliciesTable.userId, userId))
    .limit(1);

  const budgetTotal = budgetPolicy ? Number(budgetPolicy.threshold) : 0;
  const budgetUsedPercent = budgetTotal > 0 ? (thisMonthTotal / budgetTotal) * 100 : 0;

  const wsId = req.workspaceId ?? await getDefaultWorkspaceId(userId);
  const savingsRows = await db
    .select({ savingsPotential: remediationActionsTable.savingsPotential })
    .from(remediationActionsTable)
    .where(
      and(
        eq(remediationActionsTable.workspaceId, wsId),
        eq(remediationActionsTable.status, "Completed")
      )
    );

  const totalSavingsFound = savingsRows.reduce((acc: number, r: { savingsPotential: string | null }) => {
    const match = r.savingsPotential?.match(/\$?([\d.]+)/);
    return acc + (match ? Number(match[1]) : 0);
  }, 0);

  res.json({
    totalAiSpend: Number(totalSpendRow.total),
    monthToDateSpend: thisMonthTotal,
    lastMonthTotalSpend: lastMonthTotal,
    monthToDateChangePercent: Number(changePercent.toFixed(1)),
    activeAiTools: Number(activeToolsRow.count),
    activeToolsUnusedCount: Number(unusedToolsRow.count),
    renewalsThisWeek: renewalsCount,
    upcomingRenewalAmount: renewalsTotal,
    apiSpendToday: thisMonthTotal / now.getDate(),
    budgetUsedPercent: Number(budgetUsedPercent.toFixed(1)),
    forecastTotal: (thisMonthTotal / now.getDate()) * 30,
    avgApiCostPerRequest: 0,
    totalSavingsFound: totalSavingsFound
  });
});

router.get("/kpi-summary", async (req, res) => {
  const userId = req.userId!;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [totalSpendRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(eq(expensesTable.userId, userId));

  const [thisMonthRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(and(sql`${expensesTable.date} >= ${thisMonthStart}`, eq(expensesTable.userId, userId)));

  const [lastMonthRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(and(sql`${expensesTable.date} >= ${lastMonthStart} AND ${expensesTable.date} <= ${lastMonthEnd}`, eq(expensesTable.userId, userId)));

  const renewals = await db
    .select({ cost: subscriptionsTable.monthlyCost })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.status, "active"),
        sql`${subscriptionsTable.renewalDate} >= ${today} AND ${subscriptionsTable.renewalDate} <= ${sevenDaysFromNow}`,
        eq(subscriptionsTable.userId, userId)
      )
    );

  const [activeToolsRow] = await db
    .select({ count: sql<string>`COUNT(DISTINCT ${expensesTable.platformId})` })
    .from(expensesTable)
    .where(eq(expensesTable.userId, userId));

  const thisMonthTotal = Number(thisMonthRow.total);
  const lastMonthTotal = Number(lastMonthRow.total);

  const [unusedToolsRow] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(toolsTable)
    .where(
      and(
        eq(toolsTable.userId, userId),
        sql`NOT EXISTS (
          SELECT 1 FROM ${expensesTable} e 
          WHERE e.platform_id = ${toolsTable.platformId} 
          AND e.date >= ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
        )`
      )
    );

  const [budgetPolicy] = await db
    .select({ threshold: budgetPoliciesTable.thresholdAmount })
    .from(budgetPoliciesTable)
    .where(eq(budgetPoliciesTable.userId, userId))
    .limit(1);

  const budgetTotal = budgetPolicy ? Number(budgetPolicy.threshold) : 0;
  const budgetUsedPercent = budgetTotal > 0 ? (thisMonthTotal / budgetTotal) * 100 : 0;

  const wsIdKpi = req.workspaceId ?? await getDefaultWorkspaceId(userId);
  const savingsRows = await db
    .select({ savingsPotential: remediationActionsTable.savingsPotential })
    .from(remediationActionsTable)
    .where(
      and(
        eq(remediationActionsTable.workspaceId, wsIdKpi),
        eq(remediationActionsTable.status, "Completed")
      )
    );

  const totalSavingsFound = savingsRows.reduce((acc: number, r: { savingsPotential: string | null }) => {
    const match = r.savingsPotential?.match(/\$?([\d.]+)/);
    return acc + (match ? Number(match[1]) : 0);
  }, 0);

  const changePercent = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  res.json({
    totalAiSpend: Number(totalSpendRow.total),
    monthToDateSpend: thisMonthTotal,
    lastMonthTotalSpend: lastMonthTotal,
    monthToDateChangePercent: Number(changePercent.toFixed(1)),
    activeAiTools: Number(activeToolsRow.count),
    activeToolsUnusedCount: Number(unusedToolsRow.count),
    renewalsThisWeek: renewals.length,
    upcomingRenewalAmount: renewals.reduce((acc, r) => acc + Number(r.cost || 0), 0),
    apiSpendToday: thisMonthTotal / now.getDate(),
    budgetUsedPercent: Number(budgetUsedPercent.toFixed(1)),
    budgetTotal: budgetTotal,
    forecastTotal: (thisMonthTotal / now.getDate()) * 30,
    avgApiCostPerRequest: 0,
    totalSavingsFound: totalSavingsFound
  });
});

export default router;
