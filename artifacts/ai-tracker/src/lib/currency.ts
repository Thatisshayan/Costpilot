export const CURRENCIES = {
  USD: { symbol: "$", name: "US Dollar", locale: "en-US" },
  EUR: { symbol: "€", name: "Euro", locale: "de-DE" },
  GBP: { symbol: "£", name: "British Pound", locale: "en-GB" },
  JPY: { symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  CAD: { symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  AUD: { symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  INR: { symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  BRL: { symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  MXN: { symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
  SGD: { symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  CHF: { symbol: "Fr", name: "Swiss Franc", locale: "de-CH" },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
  KRW: { symbol: "₩", name: "South Korean Won", locale: "ko-KR" },
  SEK: { symbol: "kr", name: "Swedish Krona", locale: "sv-SE" },
  NOK: { symbol: "kr", name: "Norwegian Krone", locale: "nb-NO" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

/** Trim/uppercase a stored currency code so "usd" and "USD" are one currency. */
export function normalizeCurrencyCode(code: string | null | undefined): string {
  const normalized = (code ?? "").trim().toUpperCase();
  return normalized || "USD";
}

/**
 * Totals per currency, summed in whole cents to avoid floating-point drift.
 * Different currencies are never added together or converted.
 */
export function totalsByCurrency(expenses: { amount: number; currency?: string | null }[]): Map<string, number> {
  const cents = new Map<string, number>();
  for (const expense of expenses) {
    const code = normalizeCurrencyCode(expense.currency);
    cents.set(code, (cents.get(code) ?? 0) + Math.round(expense.amount * 100));
  }
  return new Map([...cents].map(([code, total]) => [code, total / 100]));
}

export function formatCurrency(amount: number, currency: CurrencyCode | string = "USD"): string {
  const config = CURRENCIES[currency as CurrencyCode];
  // Unknown codes keep their own label rather than borrowing a "$" sign.
  if (!config) return `${amount.toFixed(2)} ${normalizeCurrencyCode(currency)}`;
  try {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toFixed(2)}`;
  }
}
