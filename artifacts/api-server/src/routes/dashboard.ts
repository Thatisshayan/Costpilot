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
import { eq, sql } from "drizzle-orm";

const router = Router();

function calcDaysUntilExpiry(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;
  const end = new Date(trialEndDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

router.get("/summary", async (req, res) => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [totalSpendRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
    .from(expensesTable);

  const [thisMonthRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(sql`${expensesTable.date} >= ${thisMonthStart}`);

  const [lastMonthRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(sql`${expensesTable.date} >= ${lastMonthStart} AND ${expensesTable.date} <= ${lastMonthEnd}`);

  const [platformCount] = await db.select({ count: sql<string>`COUNT(*)` }).from(platformsTable);
  const [projectCount] = await db.select({ count: sql<string>`COUNT(*)` }).from(projectsTable);
  const [toolCount] = await db.select({ count: sql<string>`COUNT(*)` }).from(toolsTable);

  const [activeTrialsRow] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(subscriptionsTable)
    .where(sql`${subscriptionsTable.planType} = 'free_trial' AND ${subscriptionsTable.status} = 'active'`);

  const [expiringTrialsRow] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(subscriptionsTable)
    .where(
      sql`${subscriptionsTable.planType} = 'free_trial' AND ${subscriptionsTable.status} = 'active' AND ${subscriptionsTable.trialEndDate} IS NOT NULL AND ${subscriptionsTable.trialEndDate} >= ${today} AND ${subscriptionsTable.trialEndDate} <= ${sevenDaysFromNow}`
    );

  const [totalCreditsRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${creditPurchasesTable.amount}), 0)` })
    .from(creditPurchasesTable);

  res.json({
    totalSpend: Number(totalSpendRow.total),
    thisMonthSpend: Number(thisMonthRow.total),
    lastMonthSpend: Number(lastMonthRow.total),
    totalPlatforms: Number(platformCount.count),
    totalProjects: Number(projectCount.count),
    activeTrials: Number(activeTrialsRow.count),
    expiringTrials: Number(expiringTrialsRow.count),
    totalTools: Number(toolCount.count),
    totalCredits: Number(totalCreditsRow.total),
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
      sql`${subscriptionsTable.planType} = 'free_trial' AND ${subscriptionsTable.status} = 'active' AND ${subscriptionsTable.trialEndDate} IS NOT NULL AND ${subscriptionsTable.trialEndDate} >= ${today} AND ${subscriptionsTable.trialEndDate} <= ${sevenDaysFromNow}`
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
    .groupBy(expensesTable.projectId, projectsTable.name)
    .orderBy(sql`SUM(${expensesTable.amount}) DESC`);

  res.json(rows.map((r) => ({
    projectId: r.projectId ?? 0,
    projectName: r.projectName ?? "Unknown",
    total: Number(r.total),
    count: Number(r.count),
  })));
});

router.get("/monthly-spending", async (req, res) => {
  const rows = await db
    .select({
      month: sql<string>`TO_CHAR(TO_DATE(${expensesTable.date}, 'YYYY-MM-DD'), 'YYYY-MM')`,
      total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)`,
    })
    .from(expensesTable)
    .groupBy(sql`TO_CHAR(TO_DATE(${expensesTable.date}, 'YYYY-MM-DD'), 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(TO_DATE(${expensesTable.date}, 'YYYY-MM-DD'), 'YYYY-MM')`);

  res.json(rows.map((r) => ({ month: r.month, total: Number(r.total) })));
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
    .leftJoin(projectsTable, eq(expensesTable.projectId, projectsTable.id));

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
    .where(sql`${subscriptionsTable.status} = 'active'`);

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
    .leftJoin(projectsTable, eq(creditPurchasesTable.projectId, projectsTable.id));

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

export default router;
