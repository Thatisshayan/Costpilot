import { anthropicAdapter } from "./adapters/anthropic";
import { awsAdapter } from "./adapters/aws";
import { deepgramAdapter } from "./adapters/deepgram";
import { heygenAdapter } from "./adapters/heygen";
import { openaiAdapter } from "./adapters/openai";
import { openrouterAdapter } from "./adapters/openrouter";
import { vercelAdapter } from "./adapters/vercel";
import type { ProviderAdapter } from "./types";

const adapters: ProviderAdapter[] = [anthropicAdapter, openaiAdapter, openrouterAdapter, vercelAdapter, awsAdapter, deepgramAdapter, heygenAdapter];

export const providerAdapters: ReadonlyMap<string, ProviderAdapter> = new Map(adapters.map(a => [a.id, a]));

/** Public catalog for the connect form: no functions, just field specs. */
export function providerCatalog() {
  return adapters.map(({ id, label, keyHelp, fields }) => ({ id, label, keyHelp, fields }));
}
