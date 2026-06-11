import { Router } from "express";
import {
  db,
  expensesTable,
  platformsTable,
  projectsTable,
  subscriptionsTable,
  toolsTable,
  creditPurchasesTable,
  budgetPoliciesTable,
  remediationActionsTable,
  workspaceMembersTable,
} from "@workspace/db";
import { eq, sql, and, isNotNull, desc } from "drizzle-orm";

const router = Router();

function calcDaysUntilExpiry(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;
  const end = new Date(trialEndDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

async function getDefaultWorkspaceId(userId: string): Promise<number> {
  const [member] = await db
    .select({ workspaceId: workspaceMembersTable.workspaceId })
    .from(workspaceMembersTable)
    .where(eq(workspaceMembersTable.userId, userId))
    .limit(1);
  return member?.workspaceId || 0;
}

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

  // Renewals this week
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

// Active Tools (Distinct platforms with expenses)
  const [activeToolsRow] = await db
    .select({ count: sql<string>`COUNT(DISTINCT ${expensesTable.platformId})` })
    .from(expensesTable)
    .where(eq(expensesTable.userId, userId));

  // MTD Change Percent - define before use
  const thisMonthTotal = Number(thisMonthRow.total);
  const lastMonthTotal = Number(lastMonthRow.total);
  const changePercent = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  // Active Tools unused count - tools without expenses in last 30 days
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

  // Budget used percent - calculate from budget policies
  const [budgetPolicy] = await db
    .select({ threshold: budgetPoliciesTable.thresholdAmount })
    .from(budgetPoliciesTable)
    .where(eq(budgetPoliciesTable.userId, userId))
    .limit(1);

  const budgetTotal = budgetPolicy ? Number(budgetPolicy.threshold) : 0;
  const budgetUsedPercent = budgetTotal > 0 ? (thisMonthTotal / budgetTotal) * 100 : 0;

  // Savings found - from completed remediation actions with savings potential
  // Note: workspaceId may not be available in all contexts, query by workspace if available
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
    avgApiCostPerRequest: 0, // TODO: Requires request count tracking in schema
    totalSavingsFound: totalSavingsFound
  });
});

router.get("/expiring-trials", async (req, res) => {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

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
      email: subscriptionsTable.email,
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
    .where(
      and(
        sql`${subscriptionsTable.planType} = 'free_trial' AND ${subscriptionsTable.status} = 'active' AND ${subscriptionsTable.trialEndDate} IS NOT NULL AND ${subscriptionsTable.trialEndDate} >= ${today} AND ${subscriptionsTable.trialEndDate} <= ${sevenDaysFromNow}`,
        eq(subscriptionsTable.userId, req.userId!)
      )
    )
    .orderBy(subscriptionsTable.trialEndDate);

  res.json(subs.map((s) => ({
    ...s,
    monthlyCost: s.monthlyCost !== null ? Number(s.monthlyCost) : null,
    daysUntilExpiry: calcDaysUntilExpiry(s.trialEndDate),
    createdAt: s.createdAt.toISOString(),
  })));
});

router.get("/expenses-by-platform", async (req, res) => {
  const rows = await db
    .select({
      platformId: expensesTable.platformId,
      platformName: platformsTable.name,
      total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(expensesTable)
    .leftJoin(platformsTable, eq(expensesTable.platformId, platformsTable.id))
    .where(eq(expensesTable.userId, req.userId!))
    .groupBy(expensesTable.platformId, platformsTable.name)
    .orderBy(sql`SUM(${expensesTable.amount}) DESC`);

  res.json(rows.map((r) => ({
    platformId: r.platformId ?? 0,
    platformName: r.platformName ?? "Unknown",
    total: Number(r.total),
    count: Number(r.count),
  })));
});

router.get("/expenses-by-project", async (req, res) => {
  const rows = await db
    .select({
      projectId: expensesTable.projectId,
      projectName: projectsTable.name,
      total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(expensesTable)
    .leftJoin(projectsTable, eq(expensesTable.projectId, projectsTable.id))
    .where(eq(expensesTable.userId, req.userId!))
    .groupBy(expensesTable.projectId, projectsTable.name)
    .orderBy(sql`SUM(${expensesTable.amount}) DESC`);

  res.json(rows.map((r) => ({
    projectId: r.projectId ?? 0,
    projectName: r.projectName ?? "Unknown",
    total: Number(r.total),
    count: Number(r.count),
  })));
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

  // MTD Change Percent - define before use
  const thisMonthTotal = Number(thisMonthRow.total);
  const lastMonthTotal = Number(lastMonthRow.total);

  // Active Tools unused count - tools without expenses in last 30 days
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

  // Budget used percent - calculate from budget policies
  const [budgetPolicy] = await db
    .select({ threshold: budgetPoliciesTable.thresholdAmount })
    .from(budgetPoliciesTable)
    .where(eq(budgetPoliciesTable.userId, userId))
    .limit(1);

  const budgetTotal = budgetPolicy ? Number(budgetPolicy.threshold) : 0;
  const budgetUsedPercent = budgetTotal > 0 ? (thisMonthTotal / budgetTotal) * 100 : 0;

  // Savings found - from completed remediation actions with savings potential
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
    avgApiCostPerRequest: 0, // TODO: Requires request count tracking in schema
    totalSavingsFound: totalSavingsFound
  });
});

router.get("/monthly-spending", async (req, res) => {
  const rows = await db
    .select({
      month: sql<string>`TO_CHAR(TO_DATE(${expensesTable.date}, 'YYYY-MM-DD'), 'YYYY-MM')`,
      total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)`,
    })
    .from(expensesTable)
    .where(eq(expensesTable.userId, req.userId!))
    .groupBy(sql`TO_CHAR(TO_DATE(${expensesTable.date}, 'YYYY-MM-DD'), 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(TO_DATE(${expensesTable.date}, 'YYYY-MM-DD'), 'YYYY-MM')`);

  const result = [];
  for (const r of rows) {
    const total = Number(r.total);
    const [categoryStats] = await db
      .select({
        apiUsage: sql<string>`COALESCE(SUM(CASE WHEN ${expensesTable.category} = 'api_usage' THEN ${expensesTable.amount} ELSE 0 END), 0)`,
        subscription: sql<string>`COALESCE(SUM(CASE WHEN ${expensesTable.category} = 'subscription' THEN ${expensesTable.amount} ELSE 0 END), 0)`,
        infrastructure: sql<string>`COALESCE(SUM(CASE WHEN ${expensesTable.category} = 'infrastructure' THEN ${expensesTable.amount} ELSE 0 END), 0)`,
      })
      .from(expensesTable)
      .where(and(eq(expensesTable.userId, req.userId!), sql`TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') = ${r.month}`));
    result.push({
      month: r.month,
      subscriptionSpend: Number(categoryStats.subscription),
      apiUsageSpend: Number(categoryStats.apiUsage),
      infrastructureSpend: Number(categoryStats.infrastructure),
      forecastSpend: total * 1.1
    });
  }
  res.json(result);
});

router.get("/calendar-events", async (req, res) => {
  const events: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
    amount: number | null;
    platformName: string | null;
    projectName: string | null;
    urgent: boolean;
  }> = [];

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Expenses
  const expenses = await db
    .select({
      id: expensesTable.id,
      platformName: platformsTable.name,
      projectName: projectsTable.name,
      amount: expensesTable.amount,
      description: expensesTable.description,
      date: expensesTable.date,
    })
    .from(expensesTable)
    .leftJoin(platformsTable, eq(expensesTable.platformId, platformsTable.id))
    .leftJoin(projectsTable, eq(expensesTable.projectId, projectsTable.id))
    .where(eq(expensesTable.userId, req.userId!));

  for (const e of expenses) {
    events.push({
      id: `expense-${e.id}`,
      type: "expense",
      title: e.description || e.platformName || "Expense",
      date: e.date,
      amount: Number(e.amount),
      platformName: e.platformName,
      projectName: e.projectName,
      urgent: false,
    });
  }

  // Trial expiries
  const subs = await db
    .select({
      id: subscriptionsTable.id,
      platformName: platformsTable.name,
      projectName: projectsTable.name,
      trialEndDate: subscriptionsTable.trialEndDate,
      renewalDate: subscriptionsTable.renewalDate,
      planName: subscriptionsTable.planName,
      monthlyCost: subscriptionsTable.monthlyCost,
    })
    .from(subscriptionsTable)
    .leftJoin(platformsTable, eq(subscriptionsTable.platformId, platformsTable.id))
    .leftJoin(projectsTable, eq(subscriptionsTable.projectId, projectsTable.id))
    .where(and(eq(subscriptionsTable.status, 'active'), eq(subscriptionsTable.userId, req.userId!)));

  for (const s of subs) {
    if (s.trialEndDate) {
      const days = calcDaysUntilExpiry(s.trialEndDate);
      events.push({
        id: `trial-${s.id}`,
        type: "trial_expiry",
        title: `${s.platformName ?? "Trial"} trial ends`,
        date: s.trialEndDate,
        amount: null,
        platformName: s.platformName,
        projectName: s.projectName,
        urgent: days !== null && days <= 3,
      });
    }
    if (s.renewalDate) {
      events.push({
        id: `renewal-${s.id}`,
        type: "renewal",
        title: `${s.platformName ?? "Subscription"} renewal`,
        date: s.renewalDate,
        amount: s.monthlyCost !== null ? Number(s.monthlyCost) : null,
        platformName: s.platformName,
        projectName: s.projectName,
        urgent: s.renewalDate <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });
    }
  }

  // Credit purchases
  const credits = await db
    .select({
      id: creditPurchasesTable.id,
      platformName: platformsTable.name,
      projectName: projectsTable.name,
      amount: creditPurchasesTable.amount,
      description: creditPurchasesTable.description,
      purchaseDate: creditPurchasesTable.purchaseDate,
    })
    .from(creditPurchasesTable)
    .leftJoin(platformsTable, eq(creditPurchasesTable.platformId, platformsTable.id))
    .leftJoin(projectsTable, eq(creditPurchasesTable.projectId, projectsTable.id))
    .where(eq(creditPurchasesTable.userId, req.userId!));

  for (const c of credits) {
    events.push({
      id: `credit-${c.id}`,
      type: "credit_purchase",
      title: c.description || `${c.platformName ?? "Credit"} top-up`,
      date: c.purchaseDate,
      amount: Number(c.amount),
      platformName: c.platformName,
      projectName: c.projectName,
      urgent: false,
    });
  }

  res.json(events);
});

router.get("/intelligence-activity", async (req, res) => {
  const userId = req.userId!;
  
  // Get recent expenses with platform info
  const expenseActivity = await db
    .select({
      id: expensesTable.id,
      platformName: platformsTable.name,
      amount: expensesTable.amount,
      date: expensesTable.date,
      category: expensesTable.category,
    })
    .from(expensesTable)
    .leftJoin(platformsTable, eq(expensesTable.platformId, platformsTable.id))
    .where(eq(expensesTable.userId, userId))
    .orderBy(desc(expensesTable.date))
    .limit(20);

  // Get recent subscriptions with platform info
  const subscriptionActivity = await db
    .select({
      id: subscriptionsTable.id,
      platformName: platformsTable.name,
      monthlyCost: subscriptionsTable.monthlyCost,
      status: subscriptionsTable.status,
      planType: subscriptionsTable.planType,
      createdAt: subscriptionsTable.createdAt,
    })
    .from(subscriptionsTable)
    .leftJoin(platformsTable, eq(subscriptionsTable.platformId, platformsTable.id))
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(10);

  const activity = [
    ...expenseActivity.map((e) => ({
      vendor: e.platformName ?? "Unknown",
      type: e.category === "api_usage" ? "API Usage" : "Expense",
      amount: `$${Number(e.amount).toFixed(2)}`,
      date: new Date(e.date).toLocaleDateString(),
      status: "Active",
      risk: "Spend detected",
    })),
    ...subscriptionActivity.map((s) => ({
      vendor: s.platformName ?? "Unknown",
      type: "Subscription",
      amount: `$${Number(s.monthlyCost || 0).toFixed(2)}`,
      date: s.createdAt?.toLocaleDateString() ?? "N/A",
      status: s.status ?? "Active",
      risk: s.planType === "free_trial" ? "Trial" : "Renewal",
    }))
  ];

  res.json(activity);
});

router.get("/connected-sources", async (req, res) => {
  const platforms = await db
    .select({
      id: platformsTable.id,
      name: platformsTable.name,
    })
    .from(platformsTable)
    .where(eq(platformsTable.userId, req.userId!));

  res.json(platforms.map(p => ({
    id: p.id,
    name: p.name,
    type: "API",
    status: "Connected",
    lastSync: new Date().toLocaleTimeString()
  })));
});

export default router;

