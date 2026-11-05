import { authenticatedFetch } from "@workspace/api-client-react/custom-fetch";
import type { ExpenseFilters } from "@workspace/api-client-react";

export type ExportFormat = "csv" | "pdf";

/**
 * Requests an expense export for exactly one scope (personal when workspaceId
 * is null) through the existing authenticated API export endpoint. Filters, when
 * given, are the ones the expense list uses, so the file matches the list.
 */
export async function requestExpenseExport(format: ExportFormat, workspaceId: number | null, filters?: ExpenseFilters): Promise<{ blob: Blob; filename: string }> {
  const response = await authenticatedFetch("/api/exports/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ module: "expenses", format, workspaceId, ...(filters ? { filters } : {}) }),
  });
  if (!response.ok) {
    throw new Error(response.status === 403 ? "You do not have access to export this workspace." : `Export failed (HTTP ${response.status}).`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  const expectedType = format === "csv" ? "text/csv" : "application/pdf";
  if (!contentType.startsWith(expectedType)) throw new Error("The export returned an unexpected file type.");
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `costpilot-expenses.${format}`;
  return { blob: await response.blob(), filename };
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
