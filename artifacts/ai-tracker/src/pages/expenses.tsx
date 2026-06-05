import { useState } from "react";
import {
  useListExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useListPlatforms,
  useListProjects,
  getListExpensesQueryKey,
  getGetDashboardSummaryQueryKey,
  useUploadReceipt,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowUpRight, Plus, Pencil, Trash2, Calendar, Folder, Scan, Loader2, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "../lib/currency";
import CurrencySelector, { useCurrency } from "../components/currency-selector";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
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
  amount: string;
  currency: string;
  description: string;
  category: string;
  date: string;
};

const emptyForm = (): FormState => ({
  platformId: "",
  projectId: "",
  amount: "",
  currency: "USD",
  description: "",
  category: "API Usage",
  date: new Date().toISOString().slice(0, 10),
});

export default function Expenses() {
  const qc = useQueryClient();
  const { data: expenses = [], isLoading } = useListExpenses();
  const { data: platforms = [] } = useListPlatforms();
  const { data: projects = [] } = useListProjects();
  const createMutation = useCreateExpense();
  const [currency] = useCurrency();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const { mutateAsync: uploadReceipt, isPending: isUploading } = useUploadReceipt();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditTarget(e);
    setForm({
      platformId: e.platformId ? String(e.platformId) : "",
      projectId: e.projectId ? String(e.projectId) : "",
      amount: String(e.amount),
      currency: e.currency ?? "USD",
      description: e.description ?? "",
      category: e.category ?? "API Usage",
      date: e.date,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.date) {
      toast.error("Amount and date are required.");
      return;
    }
    const payload = {
      ...(form.platformId ? { platformId: Number(form.platformId) } : {}),
      ...(form.projectId ? { projectId: Number(form.projectId) } : {}),
      amount: Number(form.amount),
      currency: form.currency || "USD",
      ...(form.description ? { description: form.description } : {}),
      ...(form.category ? { category: form.category } : {}),
      date: form.date,
    };
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
        toast.success("Expense updated successfully.");
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast.success("Expense logged successfully.");
      }
      invalidate();
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save expense.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Expense deleted.");
      invalidate();
    } catch {
      toast.error("Failed to delete expense.");
    }
    setDeleteId(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadReceipt({ data: { receipt: file } });
      if (result.success && result.data) {
        const { amount, platform, category, date, description } = result.data;
        
        setEditTarget(null);
        setForm({
          ...emptyForm(),
          amount: amount ? String(amount) : "",
          category: category || "API Usage",
          date: date || new Date().toISOString().slice(0, 10),
          description: description || "",
        });

        // Fuzzy match platform if it's a string from AI
        if (platform) {
          const match = platforms.find(p => p.name.toLowerCase().includes(platform!.toLowerCase()));
          if (match) {
            setForm(prev => ({ ...prev, platformId: String(match.id) }));
          }
        }
        
        setDialogOpen(true);
        toast.success("Receipt parsed! Please verify the details.");
      }
    } catch (err) {
      toast.error("Failed to parse receipt. Please check your OpenAI API key.");
    } finally {
      // Clear input
      e.target.value = "";
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">CostPilot Ledger</h1>
          <p className="text-sm text-slate-400 mt-1">Track your granular API costs and tool purchases.</p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencySelector />
          <Link href="/import" className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] text-slate-300 text-sm font-semibold rounded-xl transition-all shadow-lg">
            <FileSpreadsheet size={16} />
            Import CSV
          </Link>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] text-slate-300 text-sm font-semibold rounded-xl transition-all shadow-lg">
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Scan size={16} />}
            {isUploading ? "Scanning..." : "Scan Receipt"}
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
          </label>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/15"
          >
            <Plus size={16} />
            Log Expense
          </button>
        </div>
      </header>

      {/* Glass Container */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-white mb-5">Expense History</h2>
        
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 font-medium">Loading history...</div>
        ) : expenses && expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Platform / Project</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right pr-2">Amount</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-sm">
                {[...expenses].reverse().map((expense) => (
                  <tr key={expense.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 pl-2 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${getHashColor(expense.platformName || "Unknown")} flex items-center justify-center font-semibold text-white text-xs shadow-sm shrink-0`}>
                        {(expense.platformName || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-1.5">
                          {expense.platformName || "Unknown Platform"}
                          <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition text-slate-500" />
                        </div>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Folder size={10} className="text-slate-500" />
                          {expense.projectName || "General"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-slate-300 font-medium">
                      {expense.category ? (
                        <span className="px-2.5 py-1 text-xs font-medium bg-white/[0.04] border border-white/[0.08] rounded-lg text-indigo-300">
                          {expense.category}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-4 text-slate-400 max-w-[250px] truncate" title={expense.description || undefined}>
                      {expense.description || <span className="text-slate-600">No description</span>}
                    </td>
                    <td className="py-4 text-slate-400 font-medium">
                      {format(new Date(expense.date + "T12:00:00"), "MMM d, yyyy")}
                    </td>
                    <td className="py-4 text-right pr-2 font-mono font-semibold text-white text-base">
                      {formatCurrency(expense.amount, currency)}
                    </td>
                    <td className="py-4 pr-2">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(expense)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(expense.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 font-medium">No expenses logged yet.</div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950/90 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">
              {editTarget ? "Edit Expense Log" : "Log API or SaaS Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform</label>
                <select
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  value={form.platformId}
                  onChange={(e) => setForm({ ...form, platformId: e.target.value })}
                >
                  <option value="" className="bg-zinc-950 text-slate-400">General platform / Independent</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id} className="bg-zinc-950 text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Project</label>
                <select
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                >
                  <option value="" className="bg-zinc-950 text-slate-400">No linked project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-zinc-950 text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                <select
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="API Usage" className="bg-zinc-950 text-white">API Usage</option>
                  <option value="Model Fine-Tuning" className="bg-zinc-950 text-white">Model Fine-Tuning</option>
                  <option value="SaaS Subscription" className="bg-zinc-950 text-white">SaaS Subscription</option>
                  <option value="Compute Server" className="bg-zinc-950 text-white">Compute Server</option>
                  <option value="Domain / Operations" className="bg-zinc-950 text-white">Domain / Operations</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Currency</label>
                <input
                  type="text"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder="USD"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expense Date *</label>
                <input
                  type="date"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder="e.g. Fine-tuning GPT-4o usage log"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4.5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/15"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : editTarget ? "Save Changes" : "Log Expense"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm bg-zinc-950/90 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white tracking-tight">Delete expense log?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400 mt-2">This action is permanent and will remove this expense from your aggregates.</p>
          <DialogFooter className="gap-2 mt-4">
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteId !== null && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-red-600/15"
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
