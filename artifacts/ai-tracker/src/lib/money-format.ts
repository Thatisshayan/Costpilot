// Display formatting for exact decimal amounts returned by the API (strings such as
// "-1500.00"). Uses each currency's own minor units (JPY 0, USD 2, BHD 3) and never converts.

function fractionDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** "1500.00" JPY -> "¥1,500"; "-20.00" USD -> "-$20.00". Unknown codes fall back to "123.45 XYZ". */
export function formatMoney(amount: string | number, currency: string, locale?: string): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return `${amount} ${currency}`;
  const digits = fractionDigits(currency);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  } catch {
    return `${value.toFixed(digits)} ${currency}`;
  }
}

/** Signed change for comparisons: "+$0.30" / "-$4.00" / "$0.00". */
export function formatSignedMoney(amount: string, currency: string, locale?: string): string {
  const value = Number(amount);
  const formatted = formatMoney(Math.abs(value), currency, locale);
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

export function isNegative(amount: string): boolean {
  return amount.trim().startsWith("-") && Number(amount) !== 0;
}
