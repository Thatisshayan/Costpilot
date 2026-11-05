// Query parsing for GET /expenses/search and the export filters (kept local, like the
// export body, so unknown keys are rejected rather than silently ignored).
import { z } from "zod";
import { isCalendarDate, toCents } from "./spend-math";
import type { ExpenseFilters } from "./spend";

const date = z.string().refine(isCalendarDate, "must be a valid YYYY-MM-DD date");
const money = z.string().regex(/^-?\d{1,8}(\.\d{1,2})?$/, "must be an amount with at most 2 decimals");
const idOrNone = z.union([z.literal("none"), z.coerce.number().int().positive()]);

/** Exact comparison in cents; formats were already checked by the field rules. */
function amountOrder(v: { minAmount?: string; maxAmount?: string }): boolean {
  if (v.minAmount === undefined || v.maxAmount === undefined) return true;
  const pattern = /^-?\d{1,8}(\.\d{1,2})?$/;
  if (!pattern.test(v.minAmount) || !pattern.test(v.maxAmount)) return true;
  return toCents(v.minAmount) <= toCents(v.maxAmount);
}

export const FilterFields = {
  q: z.string().trim().min(1).max(100).optional(),
  from: date.optional(),
  to: date.optional(),
  minAmount: money.optional(),
  maxAmount: money.optional(),
  platformId: idOrNone.optional(),
  projectId: idOrNone.optional(),
  category: z.string().max(100).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/, "must be a 3-letter ISO 4217 code").optional(),
  entryType: z.enum(["expense", "credit"]).optional(),
};

export const ExpenseSearchQuery = z.object({
  workspaceId: z.coerce.number().int().positive().optional(),
  ...FilterFields,
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).default("date_desc"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
}).strict()
  .refine(v => !v.from || !v.to || v.from <= v.to, { message: "from must not be after to", path: ["from"] })
  .refine(amountOrder, { message: "minAmount must not be greater than maxAmount", path: ["minAmount"] });

export const ExportFilters = z.object(FilterFields).strict()
  .refine(v => !v.from || !v.to || v.from <= v.to, { message: "from must not be after to", path: ["from"] })
  .refine(amountOrder, { message: "minAmount must not be greater than maxAmount", path: ["minAmount"] });

export function searchFilters(v: z.infer<typeof ExportFilters> | z.infer<typeof ExpenseSearchQuery>): ExpenseFilters {
  return {
    q: v.q, from: v.from, to: v.to, minAmount: v.minAmount, maxAmount: v.maxAmount,
    platformId: v.platformId, projectId: v.projectId, category: v.category, currency: v.currency, entryType: v.entryType,
  };
}
