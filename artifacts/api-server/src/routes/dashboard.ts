import { Router } from "express";
import {
  db,
  expensesTable,
  platformsTable,
  projectsTable,
  subscriptionsTable,
  toolsTable,
  creditPurchasesTable,
} from "@workspace/db";
import { eq, sql, and, isNotNull, desc } from "drizzle-orm";

const router = Router();

function calcDaysUntilExpiry(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;
  const end = new Date(trialEndDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

  // MTD Change Percent
  const thisMonthTotal = Number(thisMonthRow.total);
  const lastMonthTotal = Number(lastMonthRow.total);
  const changePercent = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  res.json({
    totalAiSpend: Number(totalSpendRow.total),
    monthToDateSpend: thisMonthTotal,
    lastMonthTotalSpend: lastMonthTotal,
    monthToDateChangePercent: Number(changePercent.toFixed(1)),
    activeAiTools: Number(activeToolsRow.count),
    activeToolsUnusedCount: Math.floor(Number(activeToolsRow.count) * 0.2), // Mock: 20% unused
    renewalsThisWeek: renewalsCount,
    upcomingRenewalAmount: renewalsTotal,
    apiSpendToday: thisMonthTotal / now.getDate(), // Simple daily avg for mock
    budgetUsedPercent: 72.5,
    forecastTotal: (thisMonthTotal / now.getDate()) * 30,
    avgApiCostPerRequest: 0.014,
    totalSavingsFound: 214.50
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

  const thisMonthTotal = Number(thisMonthRow.total);
  const lastMonthTotal = Number(lastMonthRow.total);
  const changePercent = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  res.json({
    totalAiSpend: Number(totalSpendRow.total),
    monthToDateSpend: thisMonthTotal,
    lastMonthTotalSpend: lastMonthTotal,
    monthToDateChangePercent: Number(changePercent.toFixed(1)),
    activeAiTools: Number(activeToolsRow.count),
    activeToolsUnusedCount: Math.floor(Number(activeToolsRow.count) * 0.2),
    renewalsThisWeek: renewals.length,
    upcomingRenewalAmount: renewals.reduce((acc, r) => acc + Number(r.cost || 0), 0),
    apiSpendToday: thisMonthTotal / now.getDate(),
    budgetUsedPercent: 72.5, // Logic for budget would go here
    budgetTotal: 1250,
    forecastTotal: (thisMonthTotal / now.getDate()) * 30,
    avgApiCostPerRequest: 0.014,
    totalSavingsFound: 214.50
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

  res.json(rows.map((r) => {
    const total = Number(r.total);
    return {
      month: r.month,
      subscriptionSpend: total * 0.4,
      apiUsageSpend: total * 0.35,
      infrastructureSpend: total * 0.15,
      forecastSpend: total * 1.1 // Example forecast
    };
  }));
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
  // Enriched activity with intelligence scoring
  const activity = [
    { vendor: "OpenAI API", type: "API Usage", amount: "$48.76", date: "Today", status: "Active", risk: "Spike" },
    { vendor: "Claude Pro", type: "Subscription", amount: "$20.00", date: "Jun 13", status: "Active", risk: "Renewal" },
    { vendor: "Runway", type: "Subscription", amount: "$35.00", date: "Jun 18", status: "Active", risk: "Unused" },
    { vendor: "Midjourney", type: "Subscription", amount: "$30.00", date: "Jun 14", status: "Active", risk: "Renewal" },
    { vendor: "Cursor Pro", type: "Subscription", amount: "$20.00", date: "Jun 21", status: "Active", risk: "Renewal" },
    { vendor: "Perplexity", type: "Subscription", amount: "$20.00", date: "Jun 15", status: "Trial", risk: "Duplicate" },
    { vendor: "ElevenLabs", type: "API Usage", amount: "$33.00", date: "Jun 16", status: "Active", risk: "Renewal" },
    { vendor: "Vercel", type: "Infrastructure", amount: "$24.00", date: "Jun 28", status: "Active", risk: "" },
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
