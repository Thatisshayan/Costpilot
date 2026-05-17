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
import { Plus, Pencil, Trash2, Coins } from "lucide-react";
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
  platformName: string | null;
  projectId: number | null;
  projectName: string | null;
  amount: number;
  credits: number | null;
  currency: string;
  description: string | null;
  purchaseDate: string;
  createdAt: string;
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
      currency: c.currency,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Top-ups</h1>
          <p className="text-sm text-muted-foreground mt-1">Track credit purchases across all AI platforms</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Top-up
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Total Spent on Credits</span>
            <Coins className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">${totalCredits.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Credit Units Purchased</span>
            <Coins className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">{totalUnits > 0 ? totalUnits.toLocaleString() : "—"}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Purchases Logged</span>
            <Coins className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono">{credits.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Platform</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Credits</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : credits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No credit purchases logged yet.</td>
                </tr>
              ) : (
                [...credits].reverse().map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(c.purchaseDate + "T12:00:00"), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {c.platformName ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.projectName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{c.description ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-right">
                      {c.credits !== null ? c.credits.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-right">
                      ${c.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Credit Purchase" : "Log Credit Top-up"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Platform *</label>
                <select
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.platformId}
                  onChange={(e) => setForm({ ...form, platformId: e.target.value })}
                >
                  <option value="">Select platform…</option>
                  {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project</label>
                <select
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                >
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Credits (units)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                  placeholder="e.g. 10000"
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Currency</label>
                <input
                  type="text"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="USD"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Purchase Date *</label>
                <input
                  type="date"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                <input
                  type="text"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="e.g. OpenAI $10 credit top-up"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : editTarget ? "Save Changes" : "Log Purchase"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete credit purchase?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteId !== null && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-destructive text-white text-sm font-medium rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
