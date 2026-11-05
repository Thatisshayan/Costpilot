import { Link } from "wouter";
import { useListExpenses, getListExpensesQueryKey } from "@workspace/api-client-react";
import { useWorkspace } from "@/context/workspace-context";
import { normalizeCurrencyCode, totalsByCurrency } from "@/lib/currency";
import { formatEntryAmount } from "@/lib/entry-type";

export default function Dashboard() {
  const { activeWorkspaceId, activeWorkspace, canWrite } = useWorkspace();
  const query = useListExpenses({ query: { queryKey: getListExpensesQueryKey(), refetchInterval: 30000 } });
  const expenses = (query.data ?? []).filter(e => (e.workspaceId ?? null) === activeWorkspaceId);
  const totals = totalsByCurrency(expenses);
  const credits = totalsByCurrency(expenses.filter(e => e.amount < 0));
  return <div className="space-y-6 pb-20">
    <h1 className="text-3xl font-bold text-white">{activeWorkspace?.name ?? "Personal"} expenses</h1>
    <p className="text-slate-300">Recorded expenses by currency, net of refunds and credits. Currencies are never converted or combined. Updated every 30 seconds while this page is open.</p>
    {query.isLoading && <p role="status">Loading expenses...</p>}
    {query.isError && <div role="alert" className="text-amber-200">Expenses could not be loaded. <button type="button" className="underline text-indigo-300" onClick={() => query.refetch()}>Try again</button></div>}
    {!query.isLoading && !query.isError && <>
      <section aria-label="Spending totals" className="grid gap-4 sm:grid-cols-3">
        {[...totals].map(([currency, amount]) => <div key={currency} className="rounded-xl border p-4"><h2>{currency} net</h2><p className="text-2xl">{amount.toFixed(2)}</p>{credits.has(currency) && <p className="text-sm text-emerald-400">Includes {Math.abs(credits.get(currency)!).toFixed(2)} {currency} refunds / credits</p>}</div>)}
      </section>
      {expenses.length === 0 ? <p>No expenses recorded in this scope yet.</p> : <ul aria-label="Recent expenses" className="space-y-3">
        {[...expenses].sort((a,b) => b.date.localeCompare(a.date)).slice(0,10).map(e => <li key={e.id} className="rounded border p-3">{e.date} · {e.description || e.platformName || "Expense"} · {formatEntryAmount(e.amount, normalizeCurrencyCode(e.currency))}</li>)}
      </ul>}
    </>}
    <Link href="/expenses" className="inline-block rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white">{canWrite ? "Manage expenses" : "View expenses"}</Link>
  </div>;
}
