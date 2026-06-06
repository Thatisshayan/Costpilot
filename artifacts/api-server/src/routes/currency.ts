import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: { EUR: 0.92, GBP: 0.79, JPY: 157.0, CAD: 1.37, AUD: 1.52, INR: 83.5, BRL: 5.05, MXN: 17.5, SGD: 1.35, CHF: 0.89 },
  EUR: { USD: 1.09, GBP: 0.86, JPY: 171.0, CAD: 1.49, AUD: 1.65 },
  GBP: { USD: 1.27, EUR: 1.16, JPY: 199.0, CAD: 1.74 },
  JPY: { USD: 0.0064, EUR: 0.0058, GBP: 0.0050 },
  CAD: { USD: 0.73, EUR: 0.67, GBP: 0.57 },
};

router.get("/rates", requireAuth, (req, res) => {
  res.json(EXCHANGE_RATES);
});

router.get("/convert", requireAuth, (req, res) => {
  const { from, to, amount } = z.object({
    from: z.string().length(3),
    to: z.string().length(3),
    amount: z.string().transform(Number),
  }).parse(req.query);

  if (!EXCHANGE_RATES[from]?.[to]) {
    return res.status(400).json({ error: `No rate for ${from} -> ${to}` });
  }

  const rate = EXCHANGE_RATES[from][to];
  const converted = amount * rate;

  return res.json({ from, to, amount, rate, converted: Math.round(converted * 100) / 100 });
});

router.get("/supported", requireAuth, (req, res) => {
  res.json({
    base: "USD",
    currencies: [
      { code: "USD", name: "US Dollar", symbol: "$" },
      { code: "EUR", name: "Euro", symbol: "€" },
      { code: "GBP", name: "British Pound", symbol: "£" },
      { code: "JPY", name: "Japanese Yen", symbol: "¥" },
      { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
      { code: "AUD", name: "Australian Dollar", symbol: "A$" },
      { code: "INR", name: "Indian Rupee", symbol: "₹" },
      { code: "BRL", name: "Brazilian Real", symbol: "R$" },
      { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
      { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
      { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
      { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
      { code: "KRW", name: "South Korean Won", symbol: "₩" },
      { code: "SEK", name: "Swedish Krona", symbol: "kr" },
      { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
    ],
  });
});

export default router;
