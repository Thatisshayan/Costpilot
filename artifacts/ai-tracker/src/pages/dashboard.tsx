import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { useGetSpendSummary, type SpendCurrency, type SpendGroup, type SpendSummary } from "@workspace/api-client-react";
import { useWorkspace } from "@/context/workspace-context";
import { apiErrorMessage } from "@/lib/api-error";
import { formatMoney, formatSignedMoney, isNegative } from "@/lib/money-format";

/** Last `count` months ending with the current UTC month, newest first, as YYYY-MM. */
export function recentMonths(today: string, count = 12): string[] {
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const index = y * 12 + (m - 1) - i;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
}

export function monthLabel(month: string, options: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" }): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Plain-language description of what the comparison figure means. */
export function comparisonText(summary: Pick<SpendSummary, "period" | "comparison">): string {
  const { period, comparison } = summary;
  if (comparison.basis === "same-days") {
    return `${dayLabel(period.start)}–${dayLabel(period.through)} compared with ${dayLabel(comparison.start)}–${dayLabel(comparison.through)}`;
  }
  return `${monthLabel(period.month)} compared with ${monthLabel(comparison.month)}`;
}

function Change({ c }: { c: SpendCurrency }) {
  const amount = Number(c.changeAmount);
  const Icon = amount > 0 ? ArrowUpRight : amount < 0 ? ArrowDownRight : Minus;
  if (Number(c.previousNet) === 0 && Number(c.net) === 0) return <p className="text-xs text-slate-400">No spend in either period.</p>;
  return (
    <p className="text-xs text-slate-300 flex items-center gap-1 flex-wrap">
      <Icon size={14} aria-hidden />
      <span>
        {formatSignedMoney(c.changeAmount, c.currency)}
        {c.changePercent !== null ? ` (${c.changePercent > 0 ? "+" : ""}${c.changePercent}%)` : ""}
        {" "}vs {formatMoney(c.previousNet, c.currency)}
        {c.changePercent === null && <span className="text-slate-400"> · no percentage: {Number(c.previousNet) === 0 ? "no spend" : "net credit"} in the comparison period</span>}
      </span>
    </p>
  );
}

function CurrencyCard({ c }: { c: SpendCurrency }) {
  return (
    <section aria-label={`${c.currency} totals`} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-300">{c.currency} net</h3>
        <span className="text-xs text-slate-400">{c.count} {c.count === 1 ? "expense" : "expenses"}</span>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${isNegative(c.net) ? "text-emerald-300" : "text-white"}`}>{formatMoney(c.net, c.currency)}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div><dt className="text-slate-400">Charges</dt><dd className="text-slate-100 tabular-nums">{formatMoney(c.charges, c.currency)}</dd></div>
        <div><dt className="text-slate-400">Refunds / credits</dt><dd className="text-emerald-300 tabular-nums">{formatMoney(c.credits, c.currency)}</dd></div>
      </dl>
      <Change c={c} />
    </section>
  );
}

function Breakdown({ title, rows, currency, empty, linkFor }: {
  title: string; rows: SpendGroup[]; currency: string; empty: string; linkFor?: (row: SpendGroup) => string;
}) {
  return (
    <section aria-label={`${title} (${currency})`} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {rows.length === 0 ? <p className="text-sm text-slate-400">No spend in this period.</p> : (
        <table className="w-full text-sm">
          <caption className="sr-only">{title}, net {currency} for the selected month, largest first</caption>
          <thead><tr className="text-xs text-slate-400 text-left"><th scope="col" className="pb-2 font-medium">Name</th><th scope="col" className="pb-2 font-medium text-right">Net</th></tr></thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map(row => {
              const name = row.name ?? empty;
              return (
                <tr key={`${row.id ?? row.name ?? "none"}`}>
                  <td className="py-2 pr-3 text-slate-200 break-words">
                    {linkFor ? <Link href={linkFor(row)} className="hover:underline focus:underline">{name}</Link> : name}
                    <span className="text-xs text-slate-400"> · {row.count}</span>
                  </td>
                  <td className={`py-2 text-right tabular-nums whitespace-nowrap ${isNegative(row.net) ? "text-emerald-300" : "text-white"}`}>{formatMoney(row.net, currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Trend({ c }: { c: SpendCurrency }) {
  const max = Math.max(...c.trend.map(t => Math.abs(Number(t.net))), 0);
  return (
    <section aria-label={`Six-month trend (${c.currency})`} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
      <h3 className="text-sm font-semibold text-white mb-3">Last six months, net {c.currency}</h3>
      <ol className="space-y-2">
        {c.trend.map(t => {
          const value = Number(t.net);
          const width = max > 0 ? Math.round((Math.abs(value) / max) * 100) : 0;
          return (
            <li key={t.month} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-xs">
              <span className="text-slate-300">{monthLabel(t.month, { month: "short", year: "2-digit" })}</span>
              <span className="h-2 rounded-full bg-white/[0.05] overflow-hidden" aria-hidden>
                <span className={`block h-full rounded-full ${value < 0 ? "bg-emerald-400/70" : "bg-indigo-400/80"}`} style={{ width: `${width}%` }} />
              </span>
              <span className="tabular-nums text-slate-100 whitespace-nowrap">{formatMoney(t.net, c.currency)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function Dashboard() {
  const { activeWorkspaceId, activeWorkspace, canWrite } = useWorkspace();
  const today = new Date().toISOString().slice(0, 10);
  const months = useMemo(() => recentMonths(today), [today]);
  const [month, setMonth] = useState(months[0]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const params = { month, ...(activeWorkspaceId !== null ? { workspaceId: activeWorkspaceId } : {}) };
  const query = useGetSpendSummary(params);
  const summary = query.data;
  const currencies = summary?.currencies ?? [];
  const active = currencies.find(c => c.currency === selectedCurrency) ?? currencies[0];
  const scopeName = activeWorkspaceId === null ? "Personal" : activeWorkspace?.name ?? "Workspace";
  const range = summary ? `from=${summary.period.start}&to=${summary.period.through}` : "";

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white">{scopeName} spending</h1>
          <p className="text-sm text-slate-300 mt-1">Recorded expenses by month, in each original currency. Currencies are never converted or added together.</p>
        </div>
        <div>
          <label htmlFor="dashboard-month" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Month</label>
          <select
            id="dashboard-month"
            value={month}
            onChange={e => { setMonth(e.target.value); setSelectedCurrency(null); }}
            className="bg-white/[0.03] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {months.map((m, i) => <option key={m} value={m} className="bg-zinc-950">{monthLabel(m)}{i === 0 ? " (month to date)" : ""}</option>)}
          </select>
        </div>
      </header>

      {query.isLoading && <p role="status" className="text-slate-300">Loading {monthLabel(month)}…</p>}

      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
          <AlertTriangle size={16} aria-hidden />
          <span>Spending could not be loaded: {apiErrorMessage(query.error, "please try again.")}</span>
          <button type="button" onClick={() => void query.refetch()} className="underline text-indigo-300">Try again</button>
        </div>
      )}

      {summary && (
        <>
          <p className="text-xs text-slate-300 flex items-start gap-2">
            <Info size={14} className="shrink-0 mt-0.5" aria-hidden />
            <span>
              Net = charges minus refunds and credits, counted by each expense's date.{" "}
              {summary.period.isPartial ? "This month is in progress: " : ""}{comparisonText(summary)}.
              {summary.comparison.basis === "same-days" && " Comparing the same days avoids treating a partial month as a drop in spending."}
            </span>
          </p>

          {currencies.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center space-y-3">
              <p className="text-slate-100 font-medium">No expenses recorded for {monthLabel(month)} in {scopeName}.</p>
              <div className="flex flex-wrap justify-center gap-3 text-sm">
                {canWrite && <Link href="/expenses" className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 font-semibold text-white">Add an expense</Link>}
                <Link href="/expenses" className="rounded-xl bg-white/5 hover:bg-white/10 px-4 py-2 font-semibold text-slate-100">View all expenses</Link>
              </div>
            </div>
          ) : (
            <>
              <section aria-label="Totals by currency" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {currencies.map(c => <CurrencyCard key={c.currency} c={c} />)}
              </section>

              {currencies.length > 1 && (
                <div role="group" aria-label="Breakdown currency" className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-300">Breakdowns in:</span>
                  {currencies.map(c => (
                    <button
                      key={c.currency}
                      type="button"
                      aria-pressed={active?.currency === c.currency}
                      onClick={() => setSelectedCurrency(c.currency)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${active?.currency === c.currency ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/[0.03] border-white/[0.12] text-slate-200 hover:bg-white/[0.06]"}`}
                    >
                      {c.currency}
                    </button>
                  ))}
                </div>
              )}

              {active && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Breakdown title="By vendor" rows={active.byVendor} currency={active.currency} empty="No vendor"
                    linkFor={row => `/expenses?${range}&currency=${active.currency}&platformId=${row.id ?? "none"}`} />
                  <Breakdown title="By project" rows={active.byProject} currency={active.currency} empty="No project"
                    linkFor={row => `/expenses?${range}&currency=${active.currency}&projectId=${row.id ?? "none"}`} />
                  <Breakdown title="By category" rows={active.byCategory} currency={active.currency} empty="Uncategorised"
                    linkFor={row => `/expenses?${range}&currency=${active.currency}&category=${encodeURIComponent(row.name ?? "")}`} />
                  <Trend c={active} />
                </div>
              )}

              <Link href={`/expenses?${range}`} className="inline-block rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white">
                View these expenses
              </Link>
            </>
          )}
        </>
      )}
    </div>
  );
}
