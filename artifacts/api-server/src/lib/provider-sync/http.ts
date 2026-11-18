import { ProviderError } from "./types";

const MAX_PAGES = 50;

/** GET a JSON document, turning auth and quota failures into actionable ProviderErrors. */
export async function getJson<T>(fetchImpl: typeof fetch, url: string, headers: Record<string, string>, provider: string): Promise<T> {
  const response = await request(fetchImpl, url, { headers: { accept: "application/json", ...headers } }, provider);
  return response.json() as Promise<T>;
}

/** Sends a request and throws an actionable ProviderError for any non-2xx response. */
export async function request(fetchImpl: typeof fetch, url: string, init: RequestInit, provider: string): Promise<Response> {
  const response = await fetchImpl(url, init);
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    if (response.status === 401 || response.status === 403) {
      throw new ProviderError(`${provider} rejected the credential (${response.status}). Check that it is an admin/billing key with read access.`, response.status);
    }
    if (response.status === 429) throw new ProviderError(`${provider} rate limit reached; the next sync will retry.`, 429);
    throw new ProviderError(`${provider} responded ${response.status}${detail ? `: ${detail}` : ""}`, response.status);
  }
  return response;
}

/** Follows `next_page` cursors until the provider reports no more pages. */
export async function collectPages<P extends { has_more?: boolean; next_page?: string | null }>(
  fetchPage: (cursor: string | undefined) => Promise<P>,
): Promise<P[]> {
  const pages: P[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await fetchPage(cursor);
    pages.push(page);
    if (!page.next_page || page.has_more === false) return pages;
    cursor = page.next_page;
  }
  throw new ProviderError(`Stopped after ${MAX_PAGES} pages; narrow the sync window.`);
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Splits [from, to) into consecutive chunks of at most `days` days. */
export function chunkWindow(from: Date, to: Date, days: number): Array<{ from: Date; to: Date }> {
  const chunks: Array<{ from: Date; to: Date }> = [];
  for (let start = from; start < to;) {
    const end = new Date(Math.min(start.getTime() + days * 86_400_000, to.getTime()));
    chunks.push({ from: start, to: end });
    start = end;
  }
  return chunks;
}
