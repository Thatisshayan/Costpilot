// Pure budget maths in integer cents (BigInt), shared by the budget status endpoint and tests.

export const DEFAULT_THRESHOLDS = [50, 80, 100];

export type BudgetState = "ok" | "alert" | "over";

/** a / b rounded half away from zero; b must be positive. */
function divRound(a: bigint, b: bigint): bigint {
  const q = a / b;
  const r = a % b;
  if (r * 2n >= b) return q + 1n;
  if (r * 2n <= -b) return q - 1n;
  return q;
}

/** Thresholds must be 1–5 integers, each 1–100, strictly ascending. */
export function thresholdsIssue(thresholds: number[]): string | null {
  if (thresholds.length < 1 || thresholds.length > 5) return "thresholds must have 1 to 5 values";
  for (let i = 0; i < thresholds.length; i++) {
    const t = thresholds[i];
    if (!Number.isInteger(t) || t < 1 || t > 100) return "each threshold must be a whole percentage from 1 to 100";
    if (i > 0 && t <= thresholds[i - 1]) return "thresholds must be strictly ascending";
  }
  return null;
}

/**
 * Status of one budget for one period. `net` already includes refunds/credits (negative
 * amounts), so a refund reduces spending against the budget.
 */
export function budgetStatus(amountCents: bigint, netCents: bigint, thresholds: number[]) {
  if (amountCents <= 0n) throw new Error("Budget amount must be positive");
  const remainingCents = amountCents - netCents;
  const percentUsed = Number(divRound(netCents * 1000n, amountCents)) / 10;
  // A threshold t is reached when net >= t% of the amount (exact integer comparison).
  const reached = thresholds.filter(t => netCents * 100n >= BigInt(t) * amountCents);
  const thresholdReached = reached.length > 0 ? Math.max(...reached) : null;
  const state: BudgetState = netCents > amountCents ? "over" : thresholdReached !== null ? "alert" : "ok";
  return { remainingCents, percentUsed, thresholdReached, state };
}
