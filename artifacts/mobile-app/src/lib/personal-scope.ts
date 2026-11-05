// The native app manages personal expenses only. Shared-workspace expenses
// are managed in the web app, so they are never listed, edited or deleted here.
export const SHARED_EXPENSE_MESSAGE = "Shared workspace expenses are managed in the CostPilot web app.";

export function isPersonalExpense(expense: { workspaceId?: number | null }): boolean {
  return expense.workspaceId === null || expense.workspaceId === undefined;
}

export function personalExpensesOnly<T extends { workspaceId?: number | null }>(expenses: T[]): T[] {
  return expenses.filter(isPersonalExpense);
}
