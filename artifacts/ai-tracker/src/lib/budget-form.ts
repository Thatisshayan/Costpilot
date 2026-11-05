// Client-side checks for the budget form. They mirror the API rules so mistakes are shown
// inline; the server still validates everything.

export type BudgetFormValues = { name: string; amount: string; currency: string; thresholds: string };
export type BudgetFormErrors = Partial<Record<keyof BudgetFormValues, string>>;

const AMOUNT = /^\d{1,10}(\.\d{1,2})?$/;

/** "50, 80,100" -> [50, 80, 100]; null when not 1–5 ascending whole percentages from 1 to 100. */
export function parseThresholds(text: string): number[] | null {
  const parts = text.split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 5 || parts.some(p => !/^\d{1,3}$/.test(p))) return null;
  const values = parts.map(Number);
  for (let i = 0; i < values.length; i++) {
    if (values[i] < 1 || values[i] > 100 || (i > 0 && values[i] <= values[i - 1])) return null;
  }
  return values;
}

export function validateBudgetForm(values: BudgetFormValues, { requireCurrency = true } = {}): BudgetFormErrors {
  const errors: BudgetFormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Enter a name.";
  else if (name.length > 80) errors.name = "Use at most 80 characters.";
  const amount = values.amount.trim();
  if (!AMOUNT.test(amount)) errors.amount = "Enter an amount such as 500 or 1250.50 (at most 2 decimals).";
  else if (Number(amount) <= 0) errors.amount = "The amount must be greater than zero.";
  if (requireCurrency && !/^[A-Z]{3}$/.test(values.currency)) errors.currency = "Choose a currency.";
  if (parseThresholds(values.thresholds) === null) {
    errors.thresholds = "Enter 1 to 5 increasing percentages from 1 to 100, such as 50, 80, 100.";
  }
  return errors;
}
