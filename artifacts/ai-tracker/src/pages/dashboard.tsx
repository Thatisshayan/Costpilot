import { Link } from "wouter";
import { useListExpenses, getListExpensesQueryKey } from "@workspace/api-client-react";
import { useWorkspace } from "@/context/workspace-context";
import { normalizeCurrencyCode, totalsByCurrency } from "@/lib/currency";
import { formatEntryAmount } from "@/lib/entry-type";

export default function Dashboard() {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const query = useListExpenses({ query: { queryKey: getListExpensesQueryKey(), refetchInterval: 30000 } });
  const expenses = (query.data ?? []).filter(e => (e.workspaceId ?? null) === activeWorkspaceId);
  const totals = totalsByCurrency(expenses);
  const credits = totalsByCurrency(expenses.filter(e => e.amount < 0));
  return <main className="space-y-6 p-6">
    <h1 className="text-3xl font-bold">{activeWorkspace?.name ?? "Personal"} expenses</h1>
    <p>Recorded expenses by currency, net of refunds and credits. Currencies are never converted or combined. Updated every 30 seconds while this page is open.</p>
    {query.isLoading && <p role="status">Loading expenses...</p>}
    {query.isError && <div role="alert">Expenses could not be loaded. <button onClick={() => query.refetch()}>Retry</button></div>}
    {!query.isLoading && !query.isError && <>
      <section aria-label="Spending totals" className="grid gap-4 sm:grid-cols-3">
        {[...totals].map(([currency, amount]) => <div key={currency} className="rounded-xl border p-4"><h2>{currency} net</h2><p className="text-2xl">{amount.toFixed(2)}</p>{credits.has(currency) && <p className="text-sm text-emerald-400">Includes {Math.abs(credits.get(currency)!).toFixed(2)} {currency} refunds / credits</p>}</div>)}
      </section>
      {expenses.length === 0 ? <p>No expenses recorded in this scope yet.</p> : <ul aria-label="Recent expenses" className="space-y-3">
        {[...expenses].sort((a,b) => b.date.localeCompare(a.date)).slice(0,10).map(e => <li key={e.id} className="rounded border p-3">{e.date} · {e.description || e.platformName || "Expense"} · {formatEntryAmount(e.amount, normalizeCurrencyCode(e.currency))}</li>)}
      </ul>}
    </>}
    <Link href="/expenses" className="inline-block rounded bg-indigo-600 p-3 text-white">Manage expenses</Link>
  </main>;
}
