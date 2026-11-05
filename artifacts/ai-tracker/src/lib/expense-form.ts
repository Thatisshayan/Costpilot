// Client-side checks that mirror the API's expense rules (artifacts/api-server/src/lib/money.ts)
// so users get immediate inline feedback. The server remains the source of truth: its
// messages are always shown when it rejects a save.

export const MAX_ABS_AMOUNT = 99_999_999.99;

export const EXPENSE_CATEGORIES = [
  "Compute",
  "Storage",
  "Network / egress",
  "Database",
  "AI / LLM API",
  "SaaS subscription",
  "Observability",
  "Domain / operations",
  "Other",
] as const;

/** Categories saved by earlier versions stay selectable when editing old records. */
export function categoryOptions(current: string | null | undefined): string[] {
  const list: string[] = [...EXPENSE_CATEGORIES];
  if (current && !list.includes(current)) list.unshift(current);
  return list;
}

const COMMON = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "CHF", "SEK", "NOK", "DKK", "SGD", "BRL", "MXN", "NZD", "ZAR"];

/** ISO 4217 codes for the currency picker: common first, then every code the browser knows. */
export function currencyOptions(current?: string | null): string[] {
  let all: string[] = [];
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    all = intl.supportedValuesOf?.("currency") ?? [];
  } catch {
    all = [];
  }
  const ordered = [...COMMON, ...all.filter(code => !COMMON.includes(code)).sort()];
  if (current && /^[A-Z]{3}$/.test(current) && !ordered.includes(current)) ordered.unshift(current);
  return ordered;
}

export type ExpenseFormFields = { amount: string; currency: string; date: string };
export type ExpenseFieldErrors = Partial<Record<"amount" | "currency" | "date" | "description", string>>;

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function validateExpenseForm(form: ExpenseFormFields): ExpenseFieldErrors {
  const errors: ExpenseFieldErrors = {};
  const raw = form.amount.trim();
  if (!raw) errors.amount = "Enter an amount.";
  else if (!/^\d+(\.\d+)?$/.test(raw)) errors.amount = "Enter a positive number such as 12.50. Choose Refund / credit for money returned.";
  else if (!/^\d+(\.\d{1,2})?$/.test(raw)) errors.amount = "Use at most 2 decimal places.";
  else if (Number(raw) <= 0) errors.amount = "The amount must be greater than zero.";
  else if (Number(raw) > MAX_ABS_AMOUNT) errors.amount = "The amount must be 99,999,999.99 or less.";
  if (!/^[A-Z]{3}$/.test(form.currency.trim().toUpperCase())) errors.currency = "Choose a 3-letter currency code such as USD.";
  if (!form.date) errors.date = "Choose the expense date.";
  else if (!isCalendarDate(form.date)) errors.date = "Enter a valid date.";
  return errors;
}

/** Maps a server validation message (e.g. "amount must have at most 2 decimal places") to its field. */
export function fieldForServerMessage(message: string): keyof ExpenseFieldErrors | null {
  const match = /^(amount|currency|date|description)\b/i.exec(message.trim());
  return match ? (match[1].toLowerCase() as keyof ExpenseFieldErrors) : null;
}
