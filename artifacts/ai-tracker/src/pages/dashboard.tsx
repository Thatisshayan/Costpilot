import { Link } from "wouter";
import { useListExpenses, getListExpensesQueryKey } from "@workspace/api-client-react";
import { useWorkspace } from "@/context/workspace-context";

export default function Dashboard() {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const query = useListExpenses({ query: { queryKey: getListExpensesQueryKey(), refetchInterval: 30000 } });
  const expenses = (query.data ?? []).filter(e => (e.workspaceId ?? null) === activeWorkspaceId);
  const totals = new Map<string, number>();
  for (const expense of expenses) totals.set(expense.currency ?? "USD", (totals.get(expense.currency ?? "USD") ?? 0) + expense.amount);
  return <main className="space-y-6 p-6">
    <h1 className="text-3xl font-bold">{activeWorkspace?.name ?? "Personal"} expenses</h1>
    <p>Recorded expenses by currency. Updated every 30 seconds while this page is open.</p>
    {query.isLoading && <p role="status">Loading expenses...</p>}
    {query.isError && <div role="alert">Expenses could not be loaded. <button onClick={() => query.refetch()}>Retry</button></div>}
    {!query.isLoading && !query.isError && <>
      <section aria-label="Spending totals" className="grid gap-4 sm:grid-cols-3">
        {[...totals].map(([currency, amount]) => <div key={currency} className="rounded-xl border p-4"><h2>{currency}</h2><p className="text-2xl">{amount.toFixed(2)}</p></div>)}
      </section>
      {expenses.length === 0 ? <p>No expenses recorded in this scope yet.</p> : <ul aria-label="Recent expenses" className="space-y-3">
        {[...expenses].sort((a,b) => b.date.localeCompare(a.date)).slice(0,10).map(e => <li key={e.id} className="rounded border p-3">{e.date} · {e.description || e.platformName || "Expense"} · {e.amount.toFixed(2)} {e.currency}</li>)}
      </ul>}
    </>}
    <Link href="/expenses" className="inline-block rounded bg-indigo-600 p-3 text-white">Manage expenses</Link>
  </main>;
}
