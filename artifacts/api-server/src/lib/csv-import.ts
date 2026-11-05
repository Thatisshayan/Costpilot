// CSV import rules (Batch 3B), pure so they can be unit tested. The browser parses the file
// and maps its columns; the server validates every row again and decides what is imported.
//
// - Amounts are exact signed decimals (negative = refund/credit), never parsed as floats.
// - Nothing is defaulted: a missing or unreadable value makes the row invalid.
// - A row whose external id was already imported in the same scope is skipped.
// - A row that looks exactly like an existing expense (same date, amount, currency, vendor,
//   project and description) is a *possible* duplicate: imported only when the user confirms,
//   because two identical charges can be legitimate.
import { z } from "zod";
import { isCalendarDate, toCents } from "./spend-math";

export const MAX_IMPORT_ROWS = 500;
const MAX_ABS_CENTS = 9_999_999_999n; // numeric(10,2)

const text = (max: number) => z.string().max(max).optional().transform(v => (v === undefined ? undefined : v.trim() || undefined));

// Hard request limits are generous so an over-long cell is reported on its own row (below)
// instead of rejecting the whole file; the stored limits are TEXT_LIMITS.
export const ImportRow = z.object({
  rowNumber: z.number().int().min(1).max(1_000_000),
  date: z.string().max(200),
  amount: z.string().max(200),
  currency: z.string().max(200),
  description: text(2000),
  category: text(2000),
  vendor: text(2000),
  project: text(2000),
  externalId: text(2000),
}).strict();
const TEXT_LIMITS = { description: 500, category: 100, vendor: 200, project: 200, externalId: 200 } as const;
const TEXT_LABEL = { description: "Description", category: "Category", vendor: "Vendor", project: "Project", externalId: "Transaction ID" } as const;
export type ImportRowInput = z.infer<typeof ImportRow>;

export const ImportRequest = z.object({
  workspaceId: z.number().int().positive().max(2147483647).nullable().optional(),
  fileName: z.string().trim().min(1).max(200).refine(v => !v.includes("\u0000"), "fileName contains an invalid character"),
  rows: z.array(ImportRow).min(1).max(MAX_IMPORT_ROWS, `at most ${MAX_IMPORT_ROWS} rows per import`),
  confirmDuplicateRows: z.array(z.number().int().min(1)).max(MAX_IMPORT_ROWS).optional(),
}).strict().superRefine((value, ctx) => {
  const seen = new Set<number>();
  for (const row of value.rows) {
    if (seen.has(row.rowNumber)) ctx.addIssue({ code: "custom", message: `row number ${row.rowNumber} appears twice`, path: ["rows"] });
    seen.add(row.rowNumber);
  }
});

export type RowStatus = "valid" | "invalid" | "already_imported" | "possible_duplicate";
export type RowResult = { rowNumber: number; status: RowStatus; messages: string[] };

/** A row that passed field validation, with amounts in cents and names still unresolved. */
export type CleanRow = {
  rowNumber: number; date: string; amountCents: bigint; currency: string;
  description?: string; category?: string; vendor?: string; project?: string; externalId?: string;
};

const AMOUNT = /^-?\d{1,8}(\.\d{1,2})?$/;

/** Field checks only (no database). Returns the cleaned row or the reasons it is invalid. */
export function checkRowFields(row: ImportRowInput): { row: CleanRow } | { messages: string[] } {
  const messages: string[] = [];
  // PostgreSQL text cannot store NUL (often a sign of a UTF-16 export); report it on the row.
  if (Object.values(row).some(v => typeof v === "string" && v.includes("\u0000"))) {
    return { messages: ["The row contains an invalid (NUL) character. Save the file as UTF-8 CSV and try again."] };
  }
  const date = row.date.trim();
  if (!isCalendarDate(date)) messages.push("Date must be a real calendar date in YYYY-MM-DD format.");
  const amount = row.amount.trim();
  let amountCents = 0n;
  if (!AMOUNT.test(amount)) messages.push("Amount must be a number with at most 2 decimals, such as 12.50 or -4.00 for a refund.");
  else {
    amountCents = toCents(amount);
    if (amountCents > MAX_ABS_CENTS || amountCents < -MAX_ABS_CENTS) messages.push("Amount is too large.");
  }
  const currency = row.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) messages.push("Currency must be a 3-letter ISO 4217 code such as USD.");
  for (const key of Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[]) {
    const value = row[key];
    if (value !== undefined && value.length > TEXT_LIMITS[key]) messages.push(`${TEXT_LABEL[key]} must be at most ${TEXT_LIMITS[key]} characters.`);
  }
  if (messages.length > 0) return { messages };
  return {
    row: {
      rowNumber: row.rowNumber, date, amountCents, currency,
      description: row.description, category: row.category, vendor: row.vendor, project: row.project, externalId: row.externalId,
    },
  };
}

/** Key used to recognise an expense that looks identical to another one in the same scope. */
export function matchKey(e: { date: string; amountCents: bigint; currency: string; platformId: number | null; projectId: number | null; description?: string | null }): string {
  return [e.date, e.amountCents.toString(), e.currency, e.platformId ?? "", e.projectId ?? "", (e.description ?? "").trim().toLowerCase()].join("|");
}
