// Provider sync contracts. Each adapter turns a provider's billing/cost API into daily cost
// lines; the engine (engine.ts) upserts them as `source = "sync"` expenses keyed by
// `externalId`, so re-syncing a day replaces its figures instead of adding duplicates.

/** One provider cost line for one UTC day, in major currency units (e.g. dollars). */
export interface DailyCost {
  /** UTC calendar day, YYYY-MM-DD. */
  date: string;
  /** Stable key for this line within the day, e.g. a model or line-item name. */
  key: string;
  amount: number;
  currency: string;
  description: string;
}

export interface SyncWindow {
  /** Inclusive start (UTC midnight). */
  from: Date;
  /** Exclusive end. */
  to: Date;
}

export interface AdapterContext {
  secret: string;
  config: Record<string, string>;
  window: SyncWindow;
  fetch: typeof fetch;
}

/** A field the user fills in when connecting a provider. */
export interface ProviderField {
  name: string;
  label: string;
  /** Secret fields are stored encrypted; others are stored in providerConfig. */
  secret: boolean;
  required: boolean;
  placeholder?: string;
  help?: string;
}

/**
 * A reading of a provider counter, for providers without a daily cost API. The engine stores
 * readings and books the difference since the previous one as today's spend.
 */
export interface CounterReading {
  metric: string;
  value: number;
  currency: string;
  /** "spend": the counter grows as money is spent. "balance": it shrinks (prepaid balance). */
  kind: "spend" | "balance";
  description: string;
}

interface AdapterBase {
  id: string;
  label: string;
  /** Where to create the credential, shown next to the form. */
  keyHelp: string;
  fields: ProviderField[];
  /** Scheduled syncs run at most this often (e.g. when the provider charges per request). */
  minIntervalHours?: number;
}

export interface DailyCostAdapter extends AdapterBase {
  mode: "daily";
  fetchDailyCosts(ctx: AdapterContext): Promise<DailyCost[]>;
}

export interface CounterAdapter extends AdapterBase {
  mode: "counter";
  readCounter(ctx: Omit<AdapterContext, "window">): Promise<CounterReading>;
}

export type ProviderAdapter = DailyCostAdapter | CounterAdapter;

/** Raised for provider responses the user can act on (bad key, missing permission). */
export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}
