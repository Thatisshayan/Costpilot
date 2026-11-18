// Subscription renewal dates and recording. Dates are UTC calendar days (YYYY-MM-DD).
//
// Month-based cycles keep a billing anchor day so month ends do not drift: a plan billed on
// the 31st renews on Feb 28 (or 29), then on Mar 31 again. Each passed renewal of an active,
// auto-recorded plan becomes one `source = "subscription"` expense whose externalId
// (`subscription:<id>:<date>`) makes recording idempotent.
import { db, expensesTable, subscriptionsTable, type Subscription } from "@workspace/db";
import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { logger } from "./logger";

export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly";
export const BILLING_CYCLES: readonly BillingCycle[] = ["weekly", "monthly", "quarterly", "yearly"];
const MONTHS: Record<Exclude<BillingCycle, "weekly">, number> = { monthly: 1, quarterly: 3, yearly: 12 };
/** Safety cap for a plan whose renewal date is far in the past. */
const MAX_CATCH_UP = 120;

const parse = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
};
const format = (y: number, m: number, d: number) =>
  `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The renewal after `day` for this cycle; month-based cycles land on `anchorDay` (clamped). */
export function nextRenewal(day: string, cycle: BillingCycle, anchorDay?: number | null): string {
  const { y, m, d } = parse(day);
  if (cycle === "weekly") {
    const next = new Date(Date.UTC(y, m - 1, d + 7));
    return next.toISOString().slice(0, 10);
  }
  const total = (m - 1) + MONTHS[cycle];
  const ny = y + Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return format(ny, nm, Math.min(anchorDay ?? d, daysInMonth(ny, nm)));
}

/** Monthly-equivalent cost in cents, for totals across plans with different cycles. */
export function monthlyEquivalentCents(amountCents: bigint, cycle: BillingCycle): bigint {
  switch (cycle) {
    case "weekly": return (amountCents * 52n + 6n) / 12n;
    case "monthly": return amountCents;
    case "quarterly": return (amountCents + 1n) / 3n;
    case "yearly": return (amountCents + 6n) / 12n;
  }
}

/** Renewal dates that have passed (<= today) starting at `next`, and the next one after them. */
export function dueRenewals(next: string, today: string, cycle: BillingCycle, anchorDay?: number | null) {
  const due: string[] = [];
  let cursor = next;
  while (cursor <= today && due.length < MAX_CATCH_UP) {
    due.push(cursor);
    cursor = nextRenewal(cursor, cycle, anchorDay);
  }
  return { due, next: cursor };
}

/**
 * Records every passed renewal of active, auto-recorded plans, then moves their next renewal
 * date on. A trial whose end date has passed becomes active, renewing on its trial end date if
 * no renewal date was set. Returns the number of expenses recorded.
 */
export async function recordDueRenewals(now = new Date()): Promise<number> {
  const today = now.toISOString().slice(0, 10);
  let recorded = 0;

  const endedTrials = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.status, "trial"), isNotNull(subscriptionsTable.trialEndDate), lte(subscriptionsTable.trialEndDate, today)));
  for (const sub of endedTrials) {
    const next = sub.nextRenewalDate ?? sub.trialEndDate!;
    await db.update(subscriptionsTable)
      .set({ status: "active", nextRenewalDate: next, billingAnchorDay: sub.billingAnchorDay ?? parse(next).d })
      .where(eq(subscriptionsTable.id, sub.id));
  }

  const due = await db.select().from(subscriptionsTable).where(and(
    eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.autoRecord, true),
    isNotNull(subscriptionsTable.nextRenewalDate), lte(subscriptionsTable.nextRenewalDate, today),
    isNotNull(subscriptionsTable.amount),
  ));
  for (const sub of due) {
    try {
      recorded += await recordSubscription(sub, today);
    } catch (err) {
      logger.error({ err, subscriptionId: sub.id }, "recording subscription renewals failed");
    }
  }
  return recorded;
}

async function recordSubscription(sub: Subscription, today: string): Promise<number> {
  const cycle = sub.billingCycle as BillingCycle;
  const { due, next } = dueRenewals(sub.nextRenewalDate!, today, cycle, sub.billingAnchorDay);
  if (due.length === 0) return 0;
  return db.transaction(async tx => {
    const ids = due.map(date => `subscription:${sub.id}:${date}`);
    const existing = await tx.select({ externalId: expensesTable.externalId }).from(expensesTable)
      .where(and(eq(expensesTable.source, "subscription"), inArray(expensesTable.externalId, ids)));
    const seen = new Set(existing.map(e => e.externalId));
    const rows = due.filter((_, i) => !seen.has(ids[i])).map(date => ({
      userId: sub.userId, workspaceId: sub.workspaceId, platformId: sub.platformId, projectId: sub.projectId,
      amount: sub.amount!, currency: sub.currency, description: `${sub.name} (${cycle} plan)`,
      category: "Subscription", date, source: "subscription", externalId: `subscription:${sub.id}:${date}`,
    }));
    if (rows.length > 0) await tx.insert(expensesTable).values(rows);
    await tx.update(subscriptionsTable)
      .set({ nextRenewalDate: next, lastRecordedDate: due[due.length - 1] })
      .where(eq(subscriptionsTable.id, sub.id));
    return rows.length;
  });
}

/** Records due renewals shortly after startup and then hourly (single API instance). */
export function startRenewalRecorder(): () => void {
  const run = () => recordDueRenewals().then(
    n => { if (n > 0) logger.info({ recorded: n }, "subscription renewals recorded"); },
    err => logger.error({ err }, "subscription renewal recording failed"),
  );
  const startup = setTimeout(run, 10_000);
  const timer = setInterval(run, 3_600_000);
  startup.unref();
  timer.unref();
  return () => { clearTimeout(startup); clearInterval(timer); };
}
