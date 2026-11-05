import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Eye, Info, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getGetBudgetStatusQueryKey, useCreateBudget, useDeleteBudget, useGetBudgetStatus, useListProjects, useUpdateBudget,
  type BudgetStatus,
} from "@workspace/api-client-react";
import { useWorkspace } from "@/context/workspace-context";
import { apiErrorMessage } from "@/lib/api-error";
import { currencyOptions } from "@/lib/expense-form";
import { formatMoney } from "@/lib/money-format";
import { parseThresholds, validateBudgetForm, type BudgetFormErrors, type BudgetFormValues } from "@/lib/budget-form";
import { monthLabel, recentMonths } from "@/pages/dashboard";

const field = "w-full bg-white/[0.03] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 aria-[invalid=true]:border-red-400";
const label = "block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5";
const WHOLE_SCOPE = "__scope";
const EMPTY_FORM: BudgetFormValues = { name: "", amount: "", currency: "USD", thresholds: "50, 80, 100" };

const STATE_STYLE: Record<BudgetStatus["state"], { bar: string; text: string; label: string }> = {
  ok: { bar: "bg-emerald-500", text: "text-emerald-300", label: "Within budget" },
  alert: { bar: "bg-amber-400", text: "text-amber-300", label: "Threshold reached" },
  over: { bar: "bg-red-500", text: "text-red-300", label: "Over budget" },
};

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-1 text-xs text-red-300">{message}</p> : null;
}

function BudgetCard({ s, canWrite, onChanged }: { s: BudgetStatus; canWrite: boolean; onChanged: () => Promise<void> }) {
  const { budget } = s;
  const update = useUpdateBudget();
  const remove = useDeleteBudget();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [values, setValues] = useState<BudgetFormValues>({ name: budget.name, amount: budget.amount, currency: budget.currency, thresholds: budget.thresholds.join(", ") });
  const [errors, setErrors] = useState<BudgetFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const style = STATE_STYLE[s.state];
  const width = Math.max(0, Math.min(100, s.percentUsed));
  const idBase = `budget-${budget.id}`;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateBudgetForm(values, { requireCurrency: false });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await update.mutateAsync({ id: budget.id, data: { name: values.name.trim(), amount: values.amount.trim(), thresholds: parseThresholds(values.thresholds)! } });
      await onChanged();
      setEditing(false);
      setServerError(null);
      toast.success(`Budget "${values.name.trim()}" updated.`);
    } catch (error) {
      setServerError(apiErrorMessage(error, "The budget could not be updated."));
    }
  };

  const destroy = async () => {
    try {
      await remove.mutateAsync({ id: budget.id });
      await onChanged();
      toast.success(`Budget "${budget.name}" deleted.`);
    } catch (error) {
      setServerError(apiErrorMessage(error, "The budget could not be deleted."));
      setConfirming(false);
    }
  };

  return (
    <li className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white break-words">{budget.name}</h3>
          <p className="text-xs text-slate-300">{budget.projectName ? `Project: ${budget.projectName}` : "Whole scope"} · {budget.currency} · monthly</p>
        </div>
        <span className={`text-xs font-semibold ${style.text}`}>{style.label}{s.thresholdReached !== null && s.state !== "over" ? ` (${s.thresholdReached}%)` : ""}</span>
      </div>
      <div>
        <div role="progressbar" aria-label={`${budget.name}: ${s.percentUsed}% of the budget used`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={width}
          className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <div className={`h-full ${style.bar}`} style={{ width: `${width}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-100">
          <span className="font-mono font-semibold">{formatMoney(s.net, budget.currency)}</span> of {formatMoney(budget.amount, budget.currency)} ({s.percentUsed}%)
        </p>
        <p className="text-xs text-slate-300">
          {s.state === "over"
            ? `Over by ${formatMoney(s.remaining.replace(/^-/, ""), budget.currency)}`
            : `${formatMoney(s.remaining, budget.currency)} remaining`}
          {" · "}Charges {formatMoney(s.charges, budget.currency)}, refunds/credits {formatMoney(s.credits, budget.currency)}, {s.count} {s.count === 1 ? "expense" : "expenses"}
          {" · "}Alerts at {budget.thresholds.join("%, ")}%
        </p>
      </div>
      {serverError && <p role="alert" className="text-sm text-red-300">{serverError}</p>}
      {canWrite && !editing && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setEditing(true); setConfirming(false); }} aria-label={`Edit budget ${budget.name}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100"><Pencil size={12} aria-hidden /> Edit</button>
          {confirming ? (
            <>
              <button type="button" onClick={() => void destroy()} className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-semibold text-white">Delete budget</button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100">Keep</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} aria-label={`Delete budget ${budget.name}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100"><Trash2 size={12} aria-hidden /> Delete</button>
          )}
        </div>
      )}
      {editing && (
        <form noValidate onSubmit={save} aria-label={`Edit budget ${budget.name}`} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor={`${idBase}-name`} className={label}>Name</label>
            <input id={`${idBase}-name`} className={field} value={values.name} onChange={e => setValues({ ...values, name: e.target.value })}
              aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? `${idBase}-name-error` : undefined} />
            <FieldError id={`${idBase}-name-error`} message={errors.name} />
          </div>
          <div>
            <label htmlFor={`${idBase}-amount`} className={label}>Amount ({budget.currency})</label>
            <input id={`${idBase}-amount`} inputMode="decimal" className={field} value={values.amount} onChange={e => setValues({ ...values, amount: e.target.value })}
              aria-invalid={errors.amount ? true : undefined} aria-describedby={errors.amount ? `${idBase}-amount-error` : undefined} />
            <FieldError id={`${idBase}-amount-error`} message={errors.amount} />
          </div>
          <div>
            <label htmlFor={`${idBase}-thresholds`} className={label}>Alert thresholds (%)</label>
            <input id={`${idBase}-thresholds`} className={field} value={values.thresholds} onChange={e => setValues({ ...values, thresholds: e.target.value })}
              aria-invalid={errors.thresholds ? true : undefined} aria-describedby={errors.thresholds ? `${idBase}-thresholds-error` : undefined} />
            <FieldError id={`${idBase}-thresholds-error`} message={errors.thresholds} />
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <button type="submit" disabled={update.isPending} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save</button>
            <button type="button" onClick={() => { setEditing(false); setErrors({}); }} className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100">Cancel</button>
          </div>
        </form>
      )}
    </li>
  );
}

/** Remounts per scope so no form value (such as a project) carries over to another workspace. */
export default function MonthlyBudgets() {
  const { activeWorkspaceId } = useWorkspace();
  return <BudgetsForScope key={activeWorkspaceId ?? "personal"} />;
}

function BudgetsForScope() {
  const { activeWorkspaceId, activeWorkspace, canWrite, activeRole } = useWorkspace();
  const cache = useQueryClient();
  const scopeParams = activeWorkspaceId !== null ? { workspaceId: activeWorkspaceId } : {};
  const today = new Date().toISOString().slice(0, 10);
  const months = useMemo(() => recentMonths(today), [today]);
  // "" asks the server for its current month (see the dashboard).
  const [month, setMonth] = useState("");
  const query = useGetBudgetStatus({ ...scopeParams, ...(month ? { month } : {}) });
  const { data: allProjects = [] } = useListProjects();
  const projects = allProjects.filter(p => (p.workspaceId ?? null) === activeWorkspaceId);
  const create = useCreateBudget();
  const [values, setValues] = useState<BudgetFormValues>(EMPTY_FORM);
  const [projectId, setProjectId] = useState(WHOLE_SCOPE);
  const [errors, setErrors] = useState<BudgetFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const scopeName = activeWorkspaceId === null ? "Personal" : activeWorkspace?.name ?? "Workspace";
  const report = query.data;
  const currentMonth = month === "" && report ? report.period.month : months[0];
  const refresh = () => cache.invalidateQueries({ queryKey: getGetBudgetStatusQueryKey() });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateBudgetForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await create.mutateAsync({ data: {
        ...(activeWorkspaceId !== null ? { workspaceId: activeWorkspaceId } : {}),
        ...(projectId !== WHOLE_SCOPE ? { projectId: Number(projectId) } : {}),
        name: values.name.trim(), currency: values.currency, amount: values.amount.trim(), thresholds: parseThresholds(values.thresholds)!,
      } });
      await refresh();
      toast.success(`Budget "${values.name.trim()}" created.`);
      setValues(EMPTY_FORM);
      setProjectId(WHOLE_SCOPE);
      setServerError(null);
    } catch (error) {
      setServerError(apiErrorMessage(error, "The budget could not be created."));
    }
  };

  return (
    <div className="pb-20 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white">{scopeName} budgets</h1>
          <p className="text-sm text-slate-300 mt-1">Monthly limits in one currency each. Spending in other currencies never counts, and nothing is converted or forecast.</p>
        </div>
        <div>
          <label htmlFor="budget-month" className={label}>Month</label>
          <select id="budget-month" value={month} onChange={e => setMonth(e.target.value)} className={field}>
            <option value="" className="bg-zinc-950">{monthLabel(currentMonth)} (month to date)</option>
            {months.filter(m => m < currentMonth).slice(0, months.length - 1).map(m => <option key={m} value={m} className="bg-zinc-950">{monthLabel(m)}</option>)}
          </select>
        </div>
      </header>

      <p className="text-xs text-slate-300 flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" aria-hidden />
        <span>Spent = charges minus refunds and credits dated in the month, from recorded expenses only. A project budget counts only that project's expenses.</span>
      </p>

      {!canWrite && activeWorkspaceId !== null && (
        <p className="text-sm text-slate-300 flex items-center gap-2"><Eye size={14} aria-hidden /> Your {activeRole ?? "current"} role can view budgets but not change them.</p>
      )}

      {query.isLoading && <p role="status" className="text-slate-300">Loading budgets…</p>}
      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
          <AlertTriangle size={16} aria-hidden />
          <span>Budgets could not be loaded: {apiErrorMessage(query.error, "please try again.")}</span>
          <button type="button" onClick={() => void query.refetch()} className="underline text-indigo-300">Try again</button>
        </div>
      )}

      {report && (report.budgets.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-slate-100">
          No budgets yet in {scopeName}.{canWrite ? " Create one below to track monthly spending against a limit." : ""}
        </div>
      ) : (
        <section aria-label={`Budget status for ${monthLabel(report.period.month)}`}>
          <h2 className="sr-only">Budget status</h2>
          <ul className="grid gap-4 lg:grid-cols-2">
            {report.budgets.map(s => <BudgetCard key={`${s.budget.id}-${s.budget.updatedAt}`} s={s} canWrite={canWrite} onChanged={async () => { await refresh(); }} />)}
          </ul>
          <Link href={`/expenses?from=${report.period.start}&to=${report.period.through}`} className="mt-4 inline-block text-sm font-semibold text-indigo-300 underline">View this month's expenses</Link>
        </section>
      ))}

      {canWrite && (
        <section aria-labelledby="new-budget" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
          <h2 id="new-budget" className="text-lg font-semibold text-white mb-4">New monthly budget</h2>
          <form noValidate onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="budget-name" className={label}>Name</label>
              <input id="budget-name" className={field} value={values.name} placeholder="e.g. Cloud infrastructure" onChange={e => setValues({ ...values, name: e.target.value })}
                aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "budget-name-error" : undefined} />
              <FieldError id="budget-name-error" message={errors.name} />
            </div>
            <div>
              <label htmlFor="budget-project" className={label}>Applies to</label>
              <select id="budget-project" className={field} value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value={WHOLE_SCOPE} className="bg-zinc-950">All of {scopeName}</option>
                {projects.map(p => <option key={p.id} value={String(p.id)} className="bg-zinc-950">Project: {p.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="budget-currency" className={label}>Currency</label>
              <select id="budget-currency" className={field} value={values.currency} onChange={e => setValues({ ...values, currency: e.target.value })}
                aria-invalid={errors.currency ? true : undefined} aria-describedby={errors.currency ? "budget-currency-error" : undefined}>
                {currencyOptions(values.currency).map(code => <option key={code} value={code} className="bg-zinc-950">{code}</option>)}
              </select>
              <FieldError id="budget-currency-error" message={errors.currency} />
            </div>
            <div>
              <label htmlFor="budget-amount" className={label}>Monthly amount</label>
              <input id="budget-amount" inputMode="decimal" className={field} value={values.amount} placeholder="e.g. 5000" onChange={e => setValues({ ...values, amount: e.target.value })}
                aria-invalid={errors.amount ? true : undefined} aria-describedby={errors.amount ? "budget-amount-error" : undefined} />
              <FieldError id="budget-amount-error" message={errors.amount} />
            </div>
            <div>
              <label htmlFor="budget-thresholds" className={label}>Alert thresholds (%)</label>
              <input id="budget-thresholds" className={field} value={values.thresholds} onChange={e => setValues({ ...values, thresholds: e.target.value })}
                aria-invalid={errors.thresholds ? true : undefined} aria-describedby={errors.thresholds ? "budget-thresholds-error" : undefined} />
              <FieldError id="budget-thresholds-error" message={errors.thresholds} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={create.isPending} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Create budget</button>
            </div>
            {serverError && <p role="alert" className="sm:col-span-2 lg:col-span-3 text-sm text-red-300">Not saved: {serverError}</p>}
          </form>
        </section>
      )}
    </div>
  );
}
