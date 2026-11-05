// Refunds and credits are stored as negative amounts. The UI never relies on a
// minus sign alone: entries are labelled, and forms take a positive magnitude
// plus an explicit type.
export type EntryType = "expense" | "refund";

export const ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  expense: "Expense",
  refund: "Refund / credit",
};

export function entryTypeOf(amount: number): EntryType {
  return amount < 0 ? "refund" : "expense";
}

/** Converts a positive magnitude typed by the user into the stored signed amount. */
export function signedAmount(magnitude: number, type: EntryType): number {
  const value = Math.abs(magnitude);
  return type === "refund" ? -value : value;
}

/** "12.50 USD" for spending, "−4.50 EUR refund / credit" for credits. */
export function formatEntryAmount(amount: number, currency: string): string {
  if (amount < 0) return `−${Math.abs(amount).toFixed(2)} ${currency} refund / credit`;
  return `${amount.toFixed(2)} ${currency}`;
}
