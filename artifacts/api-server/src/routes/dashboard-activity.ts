import { Router } from "express";
import {
  db,
  expensesTable,
  platformsTable,
  subscriptionsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/intelligence-activity", async (req, res) => {
  const userId = req.userId!;
  
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
