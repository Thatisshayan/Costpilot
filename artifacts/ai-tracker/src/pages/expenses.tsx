import { useWorkspace } from "@/context/workspace-context";
import { useState } from "react";
import {
  useListExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useListPlatforms,
  useListProjects,
  getListExpensesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Folder, AlertTriangle, Eye } from "lucide-react";
import { ExportButtons } from "@/components/export-buttons";
import { ENTRY_TYPE_LABEL, entryTypeOf, formatEntryAmount, signedAmount, type EntryType } from "@/lib/entry-type";
import { apiErrorMessage, apiFieldErrors } from "@/lib/api-error";
import {
  categoryOptions,
  currencyOptions,
  fieldForServerMessage,
  validateExpenseForm,
  type ExpenseFieldErrors,
} from "@/lib/expense-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Expense = {
  id: number;
  platformId?: number | null;
  platformName?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  amount: number;
  currency?: string;
  description?: string | null;
  category?: string | null;
  date: string;
  createdAt?: string;
};

type FormState = {
  platformId: string;
  projectId: string;
  entryType: EntryType;
  amount: string;
  currency: string;
  description: string;
  category: string;
  date: string;
};

const emptyForm = (currency = "USD"): FormState => ({
  platformId: "",
  projectId: "",
  entryType: "expense",
  amount: "",
  currency,
  description: "",
  category: "AI / LLM API",
  date: format(new Date(), "yyyy-MM-dd"),
});

const inputClass = "w-full bg-white/[0.03] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors aria-[invalid=true]:border-red-400";
const labelClass = "text-xs font-semibold text-slate-300 uppercase tracking-wider";

/** Newest first by expense date, then most recently created. */
export function sortExpensesNewestFirst<T extends { date: string; id: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
}

export default function Expenses() {
  const qc = useQueryClient();
  const { data: accessibleExpenses = [], isLoading, isError, error, refetch } = useListExpenses();
  const { data: accessiblePlatforms = [] } = useListPlatforms();
  const { data: accessibleProjects = [] } = useListProjects();
  const { activeWorkspaceId, canWrite, activeRole } = useWorkspace();
  const platforms = accessiblePlatforms.filter(p => (p.workspaceId ?? null) === activeWorkspaceId);
  const projects = accessibleProjects.filter(p => (p.workspaceId ?? null) === activeWorkspaceId);
  const expenses = sortExpensesNewestFirst(accessibleExpenses.filter(e => (e.workspaceId ?? null) === activeWorkspaceId));
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<ExpenseFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const saving = createMutation.isPending || updateMutation.isPending;

  const invalidate = () => qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });

  const update = (patch: Partial<FormState>) => {
    setForm(f => ({ ...f, ...patch }));
    setFieldErrors(errors => {
      const next = { ...errors };
      for (const key of Object.keys(patch)) delete next[key as keyof ExpenseFieldErrors];
      return next;
    });
    setFormError(null);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm(expenses[0]?.currency ?? "USD"));
    setFieldErrors({});
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditTarget(e);
    setForm({
      platformId: e.platformId ? String(e.platformId) : "",
      projectId: e.projectId ? String(e.projectId) : "",
      entryType: entryTypeOf(e.amount),
      amount: String(Math.abs(e.amount)),
      currency: e.currency ?? "USD",
      description: e.description ?? "",
      category: e.category ?? "Other",
      date: e.date,
    });
    setFieldErrors({});
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const errors = validateExpenseForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    const payload = {
      platformId: form.platformId ? Number(form.platformId) : null,
      projectId: form.projectId ? Number(form.projectId) : null,
      amount: signedAmount(Number(form.amount), form.entryType),
      currency: form.currency.trim().toUpperCase(),
      description: form.description,
      category: form.category,
      date: form.date,
    };
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
        toast.success("Expense updated.");
      } else {
        await createMutation.mutateAsync({ data: { ...payload, ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}) } });
        toast.success("Expense saved.");
      }
      await invalidate();
      setDialogOpen(false);
    } catch (err) {
      // The dialog stays open with the entered values so nothing looks saved when it was not.
      const message = apiErrorMessage(err, "The expense was not saved. Please try again.");
      const byField = apiFieldErrors(err) as ExpenseFieldErrors;
      const field = fieldForServerMessage(message);
      setFieldErrors(field ? { ...byField, [field]: message } : byField);
      setFormError(`Not saved: ${message}`);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Expense deleted.");
      await invalidate();
      setDeleteId(null);
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "The expense was not deleted. Please try again."));
    }
  };

  const describedBy = (field: keyof ExpenseFieldErrors) => (fieldErrors[field] ? `expense-${field}-error` : undefined);
  const fieldError = (field: keyof ExpenseFieldErrors) =>
    fieldErrors[field] ? <p id={`expense-${field}-error`} className="text-xs text-red-300">{fieldErrors[field]}</p> : null;

  return (
    <div className="pb-20">
      <header className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white">Expenses</h1>
          <p className="text-sm text-slate-300 mt-1">
            {activeWorkspaceId === null ? "Your personal expenses, visible only to you." : "Expenses shared with this workspace."}{" "}
            Amounts are shown in their original currency and never converted.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportButtons workspaceId={activeWorkspaceId} />
          {canWrite && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={16} aria-hidden />
              Add expense
            </button>
          )}
        </div>
      </header>

      {!canWrite && activeRole !== null && (
        <p className="mb-4 text-sm text-slate-300 flex items-center gap-2"><Eye size={14} aria-hidden /> You have read-only access to this workspace.</p>
      )}

      <section aria-labelledby="expense-history" className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:p-6 backdrop-blur-md">
        <h2 id="expense-history" className="text-lg font-semibold text-white mb-5">Expense history</h2>

        {isError ? (
          <div role="alert" className="py-8 text-sm text-amber-200 flex flex-wrap items-center gap-3">
            <AlertTriangle size={16} aria-hidden />
            <span>Expenses could not be loaded: {apiErrorMessage(error, "please try again.")}</span>
            <button type="button" onClick={() => void refetch()} className="underline text-indigo-300">Try again</button>
          </div>
        ) : isLoading ? (
          <div role="status" className="text-center py-12 text-slate-300 font-medium">Loading expenses…</div>
        ) : expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <caption className="sr-only">Expenses, newest first</caption>
              <thead>
                <tr className="border-b border-white/[0.06] text-xs font-medium text-slate-300 uppercase tracking-wider">
                  <th scope="col" className="pb-3 pl-2">Vendor / project</th>
                  <th scope="col" className="pb-3">Category</th>
                  <th scope="col" className="pb-3">Description</th>
                  <th scope="col" className="pb-3">Date</th>
                  <th scope="col" className="pb-3 text-right pr-2">Amount</th>
                  {canWrite && <th scope="col" className="pb-3 text-right pr-2"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-sm">
                {expenses.map((expense) => {
                  const label = `${expense.platformName || "expense"} on ${expense.date}`;
                  return (
                    <tr key={expense.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${getHashColor(expense.platformName || "No vendor")} flex items-center justify-center font-semibold text-white text-xs shrink-0`} aria-hidden>
                            {(expense.platformName || "–").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-white">{expense.platformName || "No vendor"}</div>
                            <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                              <Folder size={10} aria-hidden />
                              {expense.projectName || "No project"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-slate-200">
                        {expense.category ? (
                          <span className="px-2.5 py-1 text-xs font-medium bg-white/[0.04] border border-white/[0.08] rounded-lg text-indigo-200">{expense.category}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 text-slate-300 max-w-[250px] truncate" title={expense.description || undefined}>
                        {expense.description || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-4 text-slate-300 font-medium whitespace-nowrap">
                        {format(new Date(expense.date + "T12:00:00"), "MMM d, yyyy")}
                      </td>
                      <td className={`py-4 text-right pr-2 font-mono font-semibold text-base whitespace-nowrap ${expense.amount < 0 ? "text-emerald-300" : "text-white"}`}>
                        {formatEntryAmount(expense.amount, expense.currency ?? "USD")}
                      </td>
                      {canWrite && (
                        <td className="py-4 pr-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(expense)}
                              aria-label={`Edit ${label}`}
                              className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            >
                              <Pencil size={14} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDeleteError(null); setDeleteId(expense.id); }}
                              aria-label={`Delete ${label}`}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-slate-300 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            >
                              <Trash2 size={14} aria-hidden />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-slate-200 font-medium">No expenses recorded in this scope yet.</p>
            {canWrite && (
              <button type="button" onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl">
                <Plus size={16} aria-hidden /> Add your first expense
              </button>
            )}
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-zinc-950/95 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">{editTarget ? "Edit expense" : "Add expense"}</DialogTitle>
            <DialogDescription className="text-sm text-slate-300">Fields marked * are required.</DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={e => { e.preventDefault(); void handleSubmit(); }}
            className="space-y-4 py-2"
          >
            {formError && <p role="alert" className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="expense-vendor" className={labelClass}>Vendor</label>
                <select id="expense-vendor" className={inputClass} value={form.platformId} onChange={e => update({ platformId: e.target.value })}>
                  <option value="" className="bg-zinc-950">No vendor</option>
                  {platforms.map(p => <option key={p.id} value={p.id} className="bg-zinc-950">{p.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="expense-project" className={labelClass}>Project</label>
                <select id="expense-project" className={inputClass} value={form.projectId} onChange={e => update({ projectId: e.target.value })}>
                  <option value="" className="bg-zinc-950">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id} className="bg-zinc-950">{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="expense-entry-type" className={labelClass}>Type</label>
                <select id="expense-entry-type" className={inputClass} value={form.entryType} onChange={e => update({ entryType: e.target.value as EntryType })}>
                  {(Object.keys(ENTRY_TYPE_LABEL) as EntryType[]).map(type => <option key={type} value={type} className="bg-zinc-950">{ENTRY_TYPE_LABEL[type]}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="expense-amount" className={labelClass}>Amount *</label>
                <input
                  id="expense-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  className={`${inputClass} font-mono`}
                  placeholder="0.00"
                  value={form.amount}
                  aria-invalid={fieldErrors.amount ? true : undefined}
                  aria-describedby={describedBy("amount")}
                  onChange={e => update({ amount: e.target.value })}
                />
                {fieldError("amount")}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="expense-currency" className={labelClass}>Currency *</label>
                <select
                  id="expense-currency"
                  className={inputClass}
                  value={form.currency}
                  aria-invalid={fieldErrors.currency ? true : undefined}
                  aria-describedby={describedBy("currency")}
                  onChange={e => update({ currency: e.target.value })}
                >
                  {currencyOptions(form.currency).map(code => <option key={code} value={code} className="bg-zinc-950">{code}</option>)}
                </select>
                {fieldError("currency")}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="expense-date" className={labelClass}>Date *</label>
                <input
                  id="expense-date"
                  type="date"
                  className={inputClass}
                  value={form.date}
                  aria-invalid={fieldErrors.date ? true : undefined}
                  aria-describedby={describedBy("date")}
                  onChange={e => update({ date: e.target.value })}
                />
                {fieldError("date")}
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="expense-category" className={labelClass}>Category</label>
                <select id="expense-category" className={inputClass} value={form.category} onChange={e => update({ category: e.target.value })}>
                  {categoryOptions(form.category).map(c => <option key={c} value={c} className="bg-zinc-950">{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="expense-description" className={labelClass}>Description</label>
                <input
                  id="expense-description"
                  type="text"
                  className={inputClass}
                  placeholder="e.g. October AWS invoice"
                  value={form.description}
                  aria-invalid={fieldErrors.description ? true : undefined}
                  aria-describedby={describedBy("description")}
                  onChange={e => update({ description: e.target.value })}
                />
                {fieldError("description")}
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <button type="button" onClick={() => setDialogOpen(false)} disabled={saving} className="px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">
                {saving ? "Saving…" : editTarget ? "Save changes" : "Save expense"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={open => { if (!open && !deleteMutation.isPending) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm bg-zinc-950/95 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white tracking-tight">Delete this expense?</DialogTitle>
            <DialogDescription className="text-sm text-slate-300">This is permanent and removes the expense from totals and exports.</DialogDescription>
          </DialogHeader>
          {deleteError && <p role="alert" className="text-sm text-red-200">{deleteError}</p>}
          <DialogFooter className="gap-2 mt-4">
            <button type="button" onClick={() => setDeleteId(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white">Cancel</button>
            <button
              type="button"
              onClick={() => deleteId !== null && void handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper to generate a consistent color based on string
function getHashColor(str: string) {
  const colors = [
    "bg-[#10a37f]", // OpenAI green
    "bg-[#cc9966]", // Anthropic beige
    "bg-[#1a1b1f]", // Midjourney dark
    "bg-[#6366f1]", // Indigo
    "bg-[#ec4899]", // Pink
    "bg-[#8b5cf6]", // Purple
    "bg-[#f59e0b]", // Amber
    "bg-[#0ea5e9]", // Sky
    "bg-[#4f6ef7]", // DeepSeek blue
    "bg-[#ff6b4a]", // Mistral orange
    "bg-[#ff4405]", // Groq orange-red
    "bg-[#8b5cf6]", // Together AI purple
    "bg-[#ffd700]", // Replicate gold
    "bg-[#1a1b2f]", // Stability AI dark
    "bg-[#4285f4]", // Google blue
    "bg-[#39594d]", // Cohere green
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
