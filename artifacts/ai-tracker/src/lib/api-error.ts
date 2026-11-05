// Turns API failures into messages users can act on. The server stays the source of
// truth for validation: its messages and per-field details are shown as-is.

type ErrorBody = {
  error?: unknown;
  message?: unknown;
  details?: { path?: unknown; message?: unknown }[];
};

function body(error: unknown): ErrorBody | null {
  const data = (error as { data?: unknown } | null)?.data;
  return data && typeof data === "object" ? (data as ErrorBody) : null;
}

export function apiStatus(error: unknown): number | null {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

/** A readable message for a failed request, preferring the server's own explanation. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const status = apiStatus(error);
  const data = body(error);
  const details = data?.details?.filter(d => typeof d.message === "string") ?? [];
  if (details.length) {
    return details.map(d => (typeof d.path === "string" && d.path ? `${d.path}: ${d.message}` : String(d.message))).join("; ");
  }
  const generic = new Set(["Bad Request", "Forbidden", "Not found", "Not Found", "Conflict", "InternalServerError"]);
  for (const candidate of [data?.message, data?.error]) {
    if (typeof candidate === "string" && candidate.trim() && !generic.has(candidate)) return candidate;
  }
  if (status === 403) return "You don't have permission to do that in this workspace.";
  if (status === 404) return "That item no longer exists or you no longer have access to it.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status !== null && status >= 500) return "The server could not complete the request. Please try again.";
  return fallback;
}

/** Server validation issues keyed by field name, for inline form errors. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  for (const detail of body(error)?.details ?? []) {
    if (typeof detail.path === "string" && detail.path && typeof detail.message === "string") {
      result[detail.path.split(".")[0]] ??= detail.message;
    }
  }
  return result;
}
