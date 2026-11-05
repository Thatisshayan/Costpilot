import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { useGetBudgetStatus, type BudgetStatus } from "@workspace/api-client-react";
import { useWorkspace } from "@/context/workspace-context";
import { formatMoney } from "@/lib/money-format";

/** One line describing a budget that reached a threshold or went over, in its own currency. */
export function alertText(s: BudgetStatus): string {
  const label = `${s.budget.name} (${s.budget.projectName ?? "whole scope"}, ${s.budget.currency})`;
  if (s.state === "over") {
    return `${label}: over budget by ${formatMoney(s.remaining.replace(/^-/, ""), s.budget.currency)} — ${s.percentUsed}% used.`;
  }
  return `${label}: ${s.percentUsed}% used — the ${s.thresholdReached}% threshold is reached.`;
}

/**
 * In-app budget alerts for the current month in the active scope. Computed from recorded
 * expenses on each load; nothing is emailed and no forecast is made.
 */
export function BudgetAlerts() {
  const { activeWorkspaceId } = useWorkspace();
  const query = useGetBudgetStatus(activeWorkspaceId !== null ? { workspaceId: activeWorkspaceId } : {});
  const alerts = (query.data?.budgets ?? []).filter(s => s.state !== "ok");
  if (alerts.length === 0) return null;
  return (
    <section aria-label="Budget alerts" className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
      <h2 className="flex items-center gap-2 font-semibold text-amber-50">
        <AlertTriangle size={16} aria-hidden /> {alerts.length === 1 ? "1 budget needs attention" : `${alerts.length} budgets need attention`} this month
      </h2>
      <ul className="mt-2 space-y-1">
        {alerts.map(s => <li key={s.budget.id}>{alertText(s)}</li>)}
      </ul>
      <Link href="/budgets" className="mt-2 inline-block font-semibold text-indigo-300 underline">Review budgets</Link>
    </section>
  );
}
