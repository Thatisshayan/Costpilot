import { Router } from "express";
import {
  db,
  expensesTable,
  platformsTable,
  projectsTable,
  subscriptionsTable,
  creditPurchasesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { calcDaysUntilExpiry } from "./dashboard-utils";

const router = Router();

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

export default router;
