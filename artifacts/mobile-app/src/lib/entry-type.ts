// Mirrors artifacts/ai-tracker/src/lib/entry-type.ts (separate app bundle).
// Refunds and credits are stored as negative amounts; the UI labels them and
// forms take a positive magnitude plus an explicit type.
export type EntryType = "expense" | "refund";

export const ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  expense: "Expense",
  refund: "Refund / credit",
};

export function entryTypeOf(amount: number): EntryType {
  return amount < 0 ? "refund" : "expense";
}

export function signedAmount(magnitude: number, type: EntryType): number {
  const value = Math.abs(magnitude);
  return type === "refund" ? -value : value;
}

export function formatEntryAmount(amount: number, currency: string): string {
  const digits = Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return amount < 0 ? `−${digits} ${currency} refund / credit` : `${digits} ${currency}`;
}
