// Expense money/date rules shared by create, update and batch import.
// Amounts are stored as numeric(10,2); values that would be rounded or
// overflow are rejected instead of being silently changed. Negative amounts
// remain allowed (refunds/credits) pending an owner decision on that model.
export const MAX_ABS_AMOUNT = 99_999_999.99;
const CURRENCY = /^[A-Z]{3}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Trim and uppercase a currency code before validation (e.g. " usd" -> "USD"). */
export function normalizeExpenseInput(raw: unknown): unknown {
  if (raw && typeof raw === "object" && typeof (raw as { currency?: unknown }).currency === "string") {
    const input = raw as Record<string, unknown> & { currency: string };
    return { ...input, currency: input.currency.trim().toUpperCase() };
  }
  return raw;
}

function hasAtMostTwoDecimals(amount: number): boolean {
  const cents = amount * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
}

function isCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

/** Returns a client-facing error message, or null when the fields are valid. */
export function expenseFieldIssue(body: { amount?: number; currency?: string | null; date?: string }): string | null {
  if (body.amount !== undefined) {
    if (!Number.isFinite(body.amount)) return "amount must be a finite number";
    if (Math.abs(body.amount) > MAX_ABS_AMOUNT) return `amount must be between -${MAX_ABS_AMOUNT} and ${MAX_ABS_AMOUNT}`;
    if (!hasAtMostTwoDecimals(body.amount)) return "amount must have at most 2 decimal places";
  }
  if (body.currency !== undefined && body.currency !== null && !CURRENCY.test(body.currency)) {
    return "currency must be a 3-letter ISO 4217 code such as USD";
  }
  if (body.date !== undefined && !isCalendarDate(body.date)) return "date must be a valid YYYY-MM-DD date";
  return null;
}
