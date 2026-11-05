import { authenticatedFetch } from "@workspace/api-client-react/custom-fetch";

export type ExportFormat = "csv" | "pdf";

const CONTENT_TYPES: Record<ExportFormat, string> = { csv: "text/csv", pdf: "application/pdf" };

/**
 * Requests an expense export for exactly one scope (personal when workspaceId
 * is null) through the existing authenticated API export endpoint.
 */
export async function requestExpenseExport(format: ExportFormat, workspaceId: number | null): Promise<{ blob: Blob; filename: string }> {
  const response = await authenticatedFetch("/api/exports/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ module: "expenses", format, workspaceId }),
  });
  if (!response.ok) {
    throw new Error(response.status === 403 ? "You do not have access to export this workspace." : `Export failed (HTTP ${response.status}).`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith(CONTENT_TYPES[format])) throw new Error("The export returned an unexpected file type.");
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
