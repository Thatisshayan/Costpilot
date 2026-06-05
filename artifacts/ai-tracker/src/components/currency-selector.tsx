import { CURRENCIES, type CurrencyCode } from "../lib/currency";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "costpilot_currency";
const CHANGE_EVENT = "costpilot:currency-change";

function getStoredCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "USD";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in CURRENCIES) return stored as CurrencyCode;
  return "USD";
}

export function getCurrentCurrency(): CurrencyCode {
  return getStoredCurrency();
}

export function setCurrency(code: CurrencyCode) {
  localStorage.setItem(STORAGE_KEY, code);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { currency: code } }));
}

export function useCurrency(): [CurrencyCode, (code: CurrencyCode) => void] {
  const [currency, setCurrencyState] = useState<CurrencyCode>(getStoredCurrency);

  const handleChange = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    setCurrency(code);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.currency && detail.currency in CURRENCIES) {
        setCurrencyState(detail.currency);
      }
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  return [currency, handleChange];
}

export default function CurrencySelector() {
  const [currency, setCurrency] = useCurrency();

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
      className="px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer"
      aria-label="Select currency"
    >
      {(Object.entries(CURRENCIES) as [CurrencyCode, typeof CURRENCIES[CurrencyCode]][]).map(([code, info]) => (
        <option key={code} value={code} className="bg-zinc-950 text-white">
          {info.symbol} {code} — {info.name}
        </option>
      ))}
    </select>
  );
}
