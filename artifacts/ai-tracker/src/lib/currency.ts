/**
 * Multi-Currency Utility for CostPilot
 * Handles conversion and formatting for global AI spend.
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD';

export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156.42,
  CAD: 1.36
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$'
};

/**
 * Converts an amount from a source currency to a target currency.
 */
export function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode = 'USD'): number {
  if (from === to) return amount;
  
  // Normalize to USD first
  const amountInUsd = amount / EXCHANGE_RATES[from];
  
  // Convert from USD to target
  return amountInUsd * EXCHANGE_RATES[to];
}

/**
 * Formats a currency value with its appropriate symbol and precision.
 */
export function formatCurrencyGlobal(amount: number, code: CurrencyCode = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
  }).format(amount);
}

/**
 * Returns the formatted trend text with currency awareness.
 */
export function getCurrencyContext(code: CurrencyCode): string {
  if (code === 'USD') return 'Base Currency';
  return `Converted from ${code} (Rate: 1 USD = ${EXCHANGE_RATES[code]} ${code})`;
}
