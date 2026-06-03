import { useState } from "react";
import {
  useListCreditPurchases,
  useCreateCreditPurchase,
  useUpdateCreditPurchase,
  useDeleteCreditPurchase,
  useListPlatforms,
  useListProjects,
  getListCreditPurchasesQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Coins, Calendar, Folder, ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type CreditPurchase = {
  id: number;
  platformId: number;
  platformName?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  amount: number;
  credits?: number | null;
  currency?: string;
  description?: string | null;
  purchaseDate: string;
  createdAt?: string;
};

type FormState = {
  platformId: string;
  projectId: string;
  amount: string;
  credits: string;
  currency: string;
  description: string;
  purchaseDate: string;
};

const emptyForm = (): FormState => ({
  platformId: "",
  projectId: "",
  amount: "",
  credits: "",
  currency: "USD",
  description: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
});

export default function Credits() {
  const qc = useQueryClient();
  const { data: credits = [], isLoading } = useListCreditPurchases();
  const { data: platforms = [] } = useListPlatforms();
  const { data: projects = [] } = useListProjects();
  const createMutation = useCreateCreditPurchase();
  const updateMutation = useUpdateCreditPurchase();
  const deleteMutation = useDeleteCreditPurchase();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<CreditPurchase | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListCreditPurchasesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (c: CreditPurchase) => {
    setEditTarget(c);
    setForm({
      platformId: String(c.platformId),
      projectId: c.projectId ? String(c.projectId) : "",
      amount: String(c.amount),
      credits: c.credits !== null ? String(c.credits) : "",
      currency: c.currency ?? "USD",
      description: c.description ?? "",
      purchaseDate: c.purchaseDate,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.platformId || !form.amount || !form.purchaseDate) {
      toast.error("Platform, amount, and date are required.");
      return;
    }
    const payload = {
      platformId: Number(form.platformId),
      ...(form.projectId ? { projectId: Number(form.projectId) } : {}),
      amount: Number(form.amount),
      ...(form.credits ? { credits: Number(form.credits) } : {}),
      currency: form.currency || "USD",
      ...(form.description ? { description: form.description } : {}),
      purchaseDate: form.purchaseDate,
    };
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
        toast.success("Credit purchase updated.");
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast.success("Credit purchase logged.");
      }
      invalidate();
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save credit purchase.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Deleted.");
      invalidate();
    } catch {
      toast.error("Failed to delete.");
    }
    setDeleteId(null);
  };

  const totalCredits = credits.reduce((sum, c) => sum + c.amount, 0);
  const totalUnits = credits.reduce((sum, c) => sum + (c.credits ?? 0), 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Credit Top-ups</h1>
          <p className="text-sm text-slate-400 mt-1">Track balance additions and token balance reserves for LLM platforms.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/15"
        >
          <Plus size={16} />
          Log Top-up
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-slate-400">Total Credit Costs</span>
            <Coins size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">${totalCredits.toFixed(2)}</div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-slate-400">Total Credits Acquired</span>
            <Coins size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalUnits > 0 ? totalUnits.toLocaleString() : "—"}</div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-slate-400">Purchases Count</span>
            <Coins size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{credits.length}</div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-white mb-5">Top-up History</h2>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500 font-medium">Loading history...</div>
        ) : credits.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium">No top-ups recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Platform / Project</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right">Credits Acquired</th>
                  <th className="pb-3">Top-up Date</th>
                  <th className="pb-3 text-right pr-2">Amount</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {[...credits].reverse().map((c) => (
                  <tr key={c.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 pl-2 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${getHashColor(c.platformName || "Unknown")} flex items-center justify-center font-semibold text-white text-xs shadow-sm shrink-0`}>
                        {(c.platformName || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-1.5">
                          {c.platformName || "Unknown Platform"}
                          <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition text-slate-500" />
                        </div>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Folder size={10} className="text-slate-500" />
                          {c.projectName || "General"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-slate-400 max-w-[200px] truncate" title={c.description || undefined}>
                      {c.description || <span className="text-slate-600">No description</span>}
                    </td>
                    <td className="py-4 text-right font-mono font-medium text-slate-300">
                      {c.credits !== null && c.credits !== undefined ? c.credits.toLocaleString() : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-4 text-slate-400 font-medium">
                      {format(new Date(c.purchaseDate + "T12:00:00"), "MMM d, yyyy")}
                    </td>
                    <td className="py-4 text-right font-mono font-semibold text-white text-base">
                      ${c.amount.toFixed(2)}
                    </td>
                    <td className="py-4 pr-2">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
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
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950/90 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">
              {editTarget ? "Edit Credit Purchase" : "Log Credit Top-up"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform *</label>
                <select
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  value={form.platformId}
                  onChange={(e) => setForm({ ...form, platformId: e.target.value })}
                >
                  <option value="" className="bg-zinc-950 text-slate-400">Select platform…</option>
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
                  <option value="" className="bg-zinc-950 text-slate-400">No project</option>
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
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credits (units)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono"
                  placeholder="e.g. 10000"
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                />
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
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase Date *</label>
                <input
                  type="date"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder="e.g. OpenAI $10 credit top-up"
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
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : editTarget ? "Save Changes" : "Log Purchase"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm bg-zinc-950/90 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white tracking-tight">Delete credit purchase?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400 mt-2">This action is permanent and cannot be undone.</p>
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
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
