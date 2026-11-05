// Column mapping for CSV import. The browser only reshapes the file into rows; every value is
// sent as text and validated by the server, so nothing is parsed to a float or defaulted here.
import type { ImportRow } from "@workspace/api-client-react";

export const MAX_FILE_BYTES = 1024 * 1024; // 1 MB
export const MAX_ROWS = 500;

export const FIELDS = ["date", "amount", "currency", "description", "category", "vendor", "project", "externalId"] as const;
export type Field = (typeof FIELDS)[number];
export const REQUIRED: Field[] = ["date", "amount"];
export const FIELD_LABEL: Record<Field, string> = {
  date: "Date", amount: "Amount", currency: "Currency", description: "Description", category: "Category",
  vendor: "Vendor", project: "Project", externalId: "Transaction ID",
};

/** Field -> column header ("" = not mapped). */
export type Mapping = Record<Field, string>;

const HINTS: Record<Field, RegExp> = {
  date: /^(date|transaction date|charge date|billing date|invoice date|usage date)$/i,
  amount: /^(amount|cost|total|charge|net amount|amount \(.*\)|unblended ?cost)$/i,
  currency: /^(currency|currency code|ccy)$/i,
  description: /^(description|memo|details|item|line item|service)$/i,
  category: /^(category|type|service category)$/i,
  vendor: /^(vendor|provider|merchant|supplier|platform)$/i,
  project: /^(project|team|cost center|cost centre)$/i,
  externalId: /^(id|transaction id|invoice id|invoice number|reference|external id|line item id)$/i,
};

/** Suggests a column for each field by its header name; the user can change every choice. */
export function guessMapping(headers: string[]): Mapping {
  const used = new Set<string>();
  const mapping = Object.fromEntries(FIELDS.map(f => [f, ""])) as Mapping;
  for (const field of FIELDS) {
    const match = headers.find(h => !used.has(h) && HINTS[field].test(h.trim()));
    if (match) { mapping[field] = match; used.add(match); }
  }
  return mapping;
}

export function mappingIssues(mapping: Mapping, fixedCurrency: string): string[] {
  const issues = REQUIRED.filter(f => !mapping[f]).map(f => `Choose the column that holds the ${FIELD_LABEL[f].toLowerCase()}.`);
  if (!mapping.currency && !/^[A-Z]{3}$/.test(fixedCurrency)) issues.push("Choose a currency column, or the one currency every row uses.");
  const chosen = FIELDS.map(f => mapping[f]).filter(Boolean);
  if (new Set(chosen).size !== chosen.length) issues.push("Each column can be used for only one field.");
  return issues;
}

/**
 * Builds the rows sent to the API. Row numbers are the file's line numbers (the header is
 * line 1), so the server's report points at the line the user sees in their spreadsheet.
 */
export function buildRows(records: Record<string, string>[], mapping: Mapping, fixedCurrency: string): ImportRow[] {
  return records.map((record, index) => {
    const cell = (field: Field) => (mapping[field] ? (record[mapping[field]] ?? "").trim() : "");
    const row: ImportRow = {
      rowNumber: index + 2,
      date: cell("date"),
      amount: cell("amount"),
      currency: mapping.currency ? cell("currency") : fixedCurrency,
    };
    for (const field of ["description", "category", "vendor", "project", "externalId"] as const) {
      const value = cell(field);
      if (value) row[field] = value;
    }
    return row;
  });
}
