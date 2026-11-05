// Pure financial and calendar helpers (no database access), shared by the spend summary,
// expense search and exports. Money is integer cents (BigInt), never floating point.

// ---------- Decimal money as integer cents ----------

const DECIMAL = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/** "−12.3" -> -1230n. Accepts the 2-decimal strings PostgreSQL returns for numeric(10,2) sums. */
export function toCents(value: string | null | undefined): bigint {
  if (value === null || value === undefined || value === "") return 0n;
  const match = DECIMAL.exec(value.trim());
  if (!match) throw new Error(`Not a 2-decimal amount: ${value}`);
  const [, sign, whole, frac = ""] = match;
  const cents = BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0"));
  return sign ? -cents : cents;
}

/** -1230n -> "-12.30". Always two decimals; display formatting is the client's job. */
export function fromCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/**
 * Percentage change, rounded to one decimal. Null when the baseline is zero or negative
 * (net credit): a percentage would be undefined or misleading there.
 */
export function percentChange(current: bigint, previous: bigint): number | null {
  if (previous <= 0n) return null;
  const tenths = ((current - previous) * 1000n) / previous; // truncates toward zero
  const remainder = ((current - previous) * 1000n) % previous;
  const rounded = remainder * 2n >= previous ? tenths + 1n : remainder * 2n <= -previous ? tenths - 1n : tenths;
  return Number(rounded) / 10;
}

// ---------- Calendar periods ----------

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDate(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const date = utcDate(y, mo - 1, d);
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Like Date.UTC, but years 0-99 are not mapped to 1900-1999. */
function utcDate(year: number, monthIndex: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  return date;
}

function daysInMonth(year: number, month: number): number {
  return utcDate(year, month, 0).getUTCDate();
}

function iso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export type Period = { month: string; start: string; end: string; through: string; isPartial: boolean };
export type Comparison = { month: string; start: string; through: string; basis: "full-month" | "same-days" };

/**
 * The selected month. For the current month, `through` is today (UTC) and the period is
 * partial; earlier months run to their last day. Future months are rejected.
 */
export function monthPeriod(month: string, today: string): Period {
  const m = MONTH.exec(month);
  if (!m) throw new RangeError("month must be YYYY-MM");
  if (!isCalendarDate(today)) throw new RangeError("today must be YYYY-MM-DD");
  const [year, mon] = [Number(m[1]), Number(m[2])];
  const start = iso(year, mon, 1);
  const end = iso(year, mon, daysInMonth(year, mon));
  if (start > today) throw new RangeError("month is in the future");
  const isPartial = end > today;
  return { month, start, end, through: isPartial ? today : end, isPartial };
}

/**
 * Comparable earlier period. A complete month is compared with the complete previous month.
 * A partial month (1st to day D) is compared with the previous month's 1st to day D, clamped
 * to that month's length, so "month to date" is never compared with a whole month.
 */
export function comparisonPeriod(period: Period): Comparison {
  const month = shiftMonth(period.month, -1);
  const [y, m] = month.split("-").map(Number);
  const last = daysInMonth(y, m);
  if (!period.isPartial) return { month, start: iso(y, m, 1), through: iso(y, m, last), basis: "full-month" };
  const day = Number(period.through.slice(8, 10));
  return { month, start: iso(y, m, 1), through: iso(y, m, Math.min(day, last)), basis: "same-days" };
}
