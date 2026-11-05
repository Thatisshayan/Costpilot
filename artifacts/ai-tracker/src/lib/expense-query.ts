// Expense list filters <-> URL query string <-> API parameters.
// URL keys use exactly the API parameter names (q, from, to, minAmount, maxAmount, platformId,
// projectId, category, currency, entryType, sort) plus a 1-based `page`, so other screens can
// deep-link, e.g. /expenses?from=2026-09-01&to=2026-09-30&projectId=none.
import type { ExpenseFilters, SearchExpensesParams } from "@workspace/api-client-react";

export const PAGE_SIZE = 25;

export const SORTS = ["date_desc", "date_asc", "amount_desc", "amount_asc"] as const;
export type Sort = (typeof SORTS)[number];
export const ENTRY_TYPES = ["expense", "credit"] as const;
export type EntryTypeFilter = (typeof ENTRY_TYPES)[number];

export type ExpenseQuery = {
  q?: string;
  from?: string;
  to?: string;
  minAmount?: string;
  maxAmount?: string;
  platformId?: string;
  projectId?: string;
  /** "" means uncategorised. */
  category?: string;
  currency?: string;
  entryType?: EntryTypeFilter;
  sort: Sort;
  page: number;
};

export const EMPTY_QUERY: ExpenseQuery = { sort: "date_desc", page: 1 };

const TEXT_KEYS = ["q", "from", "to", "minAmount", "maxAmount", "platformId", "projectId", "currency"] as const;

/** Reads known keys from a query string; unknown keys and malformed values are ignored. */
export function parseExpenseQuery(search: string): ExpenseQuery {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const query: ExpenseQuery = { ...EMPTY_QUERY };
  for (const key of TEXT_KEYS) {
    const value = params.get(key)?.trim();
    if (value) query[key] = value;
  }
  if (params.has("category")) query.category = params.get("category") ?? "";
  const entryType = params.get("entryType");
  if (entryType && (ENTRY_TYPES as readonly string[]).includes(entryType)) query.entryType = entryType as EntryTypeFilter;
  const sort = params.get("sort");
  if (sort && (SORTS as readonly string[]).includes(sort)) query.sort = sort as Sort;
  const page = Number(params.get("page"));
  if (Number.isInteger(page) && page > 1) query.page = page;
  return query;
}

/** The query string for a set of filters (defaults omitted, so a clean list has no query). */
export function serializeExpenseQuery(query: ExpenseQuery): string {
  const params = new URLSearchParams();
  for (const key of TEXT_KEYS) {
    const value = query[key];
    if (value) params.set(key, value);
  }
  if (query.category !== undefined) params.set("category", query.category);
  if (query.entryType) params.set("entryType", query.entryType);
  if (query.sort !== "date_desc") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

export function hasActiveFilters(query: ExpenseQuery): boolean {
  return TEXT_KEYS.some(key => Boolean(query[key])) || query.category !== undefined || Boolean(query.entryType);
}

/** Filters other than the search text (shown behind the phone "Filters" toggle). */
export function activeFilterCount(query: ExpenseQuery): number {
  const keys = TEXT_KEYS.filter(key => key !== "q" && Boolean(query[key])).length;
  return keys + (query.category !== undefined ? 1 : 0) + (query.entryType ? 1 : 0) + (query.sort !== "date_desc" ? 1 : 0);
}

export type FilterErrors = Partial<Record<"from" | "to" | "minAmount" | "maxAmount" | "currency", string>>;

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Signed amount with at most 2 decimals and 8 integer digits (mirrors the API). */
function isAmount(value: string): boolean {
  const body = value.startsWith("-") ? value.slice(1) : value;
  const parts = body.split(".");
  if (parts.length > 2 || !/^\d{1,8}$/.test(parts[0])) return false;
  return parts.length === 1 || /^\d{1,2}$/.test(parts[1]);
}

/** Checks made before calling the API; invalid filters are never sent. */
export function validateExpenseQuery(query: ExpenseQuery): FilterErrors {
  const errors: FilterErrors = {};
  if (query.from && !isCalendarDate(query.from)) errors.from = "Enter a valid start date.";
  if (query.to && !isCalendarDate(query.to)) errors.to = "Enter a valid end date.";
  if (!errors.from && !errors.to && query.from && query.to && query.from > query.to) errors.from = "The start date must be on or before the end date.";
  if (query.minAmount && !isAmount(query.minAmount)) errors.minAmount = "Use a number with at most 2 decimals, e.g. 10 or -5.50.";
  if (query.maxAmount && !isAmount(query.maxAmount)) errors.maxAmount = "Use a number with at most 2 decimals, e.g. 100.";
  if (!errors.minAmount && !errors.maxAmount && query.minAmount && query.maxAmount && Number(query.minAmount) > Number(query.maxAmount)) {
    errors.minAmount = "The minimum must not be larger than the maximum.";
  }
  if (query.currency && !/^[A-Z]{3}$/.test(query.currency)) errors.currency = "Choose a 3-letter currency code.";
  return errors;
}

function filterFields(query: ExpenseQuery): ExpenseFilters {
  const filters: ExpenseFilters = {};
  for (const key of TEXT_KEYS) {
    const value = query[key];
    if (value) filters[key] = value;
  }
  if (query.category !== undefined) filters.category = query.category;
  if (query.entryType) filters.entryType = query.entryType;
  return filters;
}

/** API parameters for GET /expenses/search (workspaceId omitted for Personal). */
export function toSearchParams(query: ExpenseQuery, workspaceId: number | null): SearchExpensesParams {
  return {
    ...(workspaceId !== null ? { workspaceId } : {}),
    ...filterFields(query),
    sort: query.sort,
    limit: PAGE_SIZE,
    offset: (query.page - 1) * PAGE_SIZE,
  };
}

/** The same filters for POST /exports/generate, so an export matches the list. */
export function toExportFilters(query: ExpenseQuery): ExpenseFilters | undefined {
  const filters = filterFields(query);
  return Object.keys(filters).length ? filters : undefined;
}
