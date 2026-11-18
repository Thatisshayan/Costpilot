// Recurring plans (Step C): ChatGPT Plus, Claude Max and the like. Active, auto-recorded plans
// become expenses on each renewal (server side), so they count in the dashboard and budgets.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
  useListPlatforms,
  type Subscription,
} from "@workspace/api-client-react";
import { AlertTriangle, CalendarClock, Eye, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { apiErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/money-format";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Cycle = "weekly" | "monthly" | "quarterly" | "yearly";
type Status = "active" | "trial" | "paused" | "cancelled";

type FormState = {
  name: string;
  amount: string;
  currency: string;
  billingCycle: Cycle;
  status: Status;
  nextRenewalDate: string;
  trialEndDate: string;
  platformId: string;
  autoRecord: boolean;
  notes: string;
};

/** Quick-add names only: prices change, so the amount is always entered by the user. */
export const PRESETS = ["ChatGPT Plus", "Claude Max", "HeyGen", "Higgsfield", "NVIDIA", "Netflix"];
const CYCLE_LABEL: Record<Cycle, string> = { weekly: "per week", monthly: "per month", quarterly: "per quarter", yearly: "per year" };
const STATUS_STYLE: Record<Status, string> = {
  active: "text-emerald-300 border-emerald-500/30", trial: "text-sky-300 border-sky-500/30",
  paused: "text-amber-300 border-amber-500/30", cancelled: "text-slate-400 border-white/10",
};

const inputClass = "w-full bg-white/[0.03] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors";
const labelClass = "text-xs font-semibold text-slate-300 uppercase tracking-wider";

const emptyForm = (name = ""): FormState => ({
  name, amount: "", currency: "USD", billingCycle: "monthly", status: "active",
  nextRenewalDate: "", trialEndDate: "", platformId: "", autoRecord: true, notes: "",
});

/** Client-side checks mirroring the API, so mistakes show next to the form. */
export function formIssue(f: FormState): string | null {
  if (!f.name.trim()) return "Enter a name.";
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(f.amount.trim())) return "Enter the price as a number, e.g. 20 or 19.99.";
  if (!/^[A-Z]{3}$/.test(f.currency.trim().toUpperCase())) return "Currency must be a 3-letter code such as USD.";
  if (f.status === "active" && !f.nextRenewalDate) return "Enter the next charge date.";
  if (f.status === "trial" && !f.trialEndDate) return "Enter the date the trial ends.";
  return null;
}

/** Per-currency monthly totals of active plans. */
export function monthlyTotals(subs: Pick<Subscription, "status" | "currency" | "monthlyEquivalent">[]) {
  const totals = new Map<string, number>();
  for (const s of subs) {
    if (s.status !== "active") continue;
    totals.set(s.currency, (totals.get(s.currency) ?? 0) + Math.round(Number(s.monthlyEquivalent) * 100));
  }
  return [...totals.entries()].map(([currency, cents]) => ({ currency, amount: (cents / 100).toFixed(2) }));
}

export default function Subscriptions() {
  const qc = useQueryClient();
  const { activeWorkspaceId, canWrite, activeRole } = useWorkspace();
  const params = activeWorkspaceId !== null ? { workspaceId: activeWorkspaceId } : {};
  const { data: subs = [], isLoading, isError, error, refetch } = useListSubscriptions(params);
  const { data: platforms = [] } = useListPlatforms();
  const vendors = platforms.filter(p => (p.workspaceId ?? null) === activeWorkspaceId);
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const deleteMutation = useDeleteSubscription();
  const saving = createMutation.isPending || updateMutation.isPending;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);

  // Recording a plan creates expenses, which feed the dashboard and budgets too.
  const refreshAll = () => qc.invalidateQueries();

  const openAdd = (name = "") => {
    const vendor = vendors.find(v => name && v.name.toLowerCase().includes(name.split(" ")[0].toLowerCase()));
    setEditTarget(null);
    setForm({ ...emptyForm(name), platformId: vendor ? String(vendor.id) : "" });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (s: Subscription) => {
    setEditTarget(s);
    setForm({
      name: s.name, amount: s.amount, currency: s.currency, billingCycle: s.billingCycle as Cycle, status: s.status as Status,
      nextRenewalDate: s.nextRenewalDate ?? "", trialEndDate: s.trialEndDate ?? "",
      platformId: s.platformId ? String(s.platformId) : "", autoRecord: s.autoRecord, notes: s.notes ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const issue = formIssue(form);
    if (issue) { setFormError(issue); return; }
    const data = {
      name: form.name.trim(), amount: form.amount.trim(), currency: form.currency.trim().toUpperCase(),
      billingCycle: form.billingCycle, status: form.status,
      nextRenewalDate: form.nextRenewalDate || null, trialEndDate: form.trialEndDate || null,
      platformId: form.platformId ? Number(form.platformId) : null, autoRecord: form.autoRecord,
      notes: form.notes.trim() || null,
    };
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data });
        toast.success(`${data.name} updated.`);
      } else {
        await createMutation.mutateAsync({ data: { ...data, ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}) } });
        toast.success(`${data.name} added.`);
      }
      await refreshAll();
      setDialogOpen(false);
    } catch (err) {
      setFormError(`Not saved: ${apiErrorMessage(err, "please try again.")}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id });
      toast.success(`${deleteTarget.name} deleted. Recorded charges were kept.`);
      setDeleteTarget(null);
      await refreshAll();
    } catch (err) {
      toast.error(apiErrorMessage(err, "The subscription was not deleted."));
    }
  };

  const totals = monthlyTotals(subs);

  return (
    <div className="pb-20">
      <header className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white">Subscriptions</h1>
          <p className="text-sm text-slate-300 mt-1">Recurring plans. Each renewal is recorded as an expense on its charge date, so it counts in your dashboard and budgets.</p>
        </div>
        {canWrite && (
          <button type="button" onClick={() => openAdd()} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl">
            <Plus size={16} aria-hidden /> Add subscription
          </button>
        )}
      </header>

      {!canWrite && activeRole !== null && (
        <p className="mb-4 text-sm text-slate-300 flex items-center gap-2"><Eye size={14} aria-hidden /> You have read-only access to this workspace's subscriptions.</p>
      )}

      {canWrite && (
        <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Quick add">
          <span className="text-xs text-slate-400">Quick add:</span>
          {PRESETS.map(name => (
            <button key={name} type="button" onClick={() => openAdd(name)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200">
              {name}
            </button>
          ))}
        </div>
      )}

      {totals.length > 0 && (
        <section aria-label="Monthly total" className="mb-6 flex flex-wrap gap-4">
          {totals.map(t => (
            <div key={t.currency} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Active plans per month ({t.currency})</p>
              <p className="text-2xl font-bold text-white mt-1">{formatMoney(t.amount, t.currency)}</p>
            </div>
          ))}
        </section>
      )}

      {isError ? (
        <div role="alert" className="py-8 px-6 text-sm text-amber-200 flex flex-wrap items-center gap-3 border border-amber-500/20 rounded-2xl">
          <AlertTriangle size={16} aria-hidden />
          <span>Subscriptions could not be loaded: {apiErrorMessage(error, "please try again.")}</span>
          <button type="button" onClick={() => void refetch()} className="underline text-indigo-300">Try again</button>
        </div>
      ) : isLoading ? (
        <div role="status" className="text-center py-12 text-slate-300">Loading subscriptions…</div>
      ) : subs.length === 0 ? (
        <div className="text-center py-12 space-y-2 border border-white/[0.06] rounded-2xl">
          <p className="text-slate-200 font-medium">No subscriptions in this scope yet.</p>
          <p className="text-sm text-slate-400">Use Quick add above, or Add subscription.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {subs.map(s => (
            <li key={s.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-wrap items-center gap-4 justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-white">{s.name}</h2>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-md border ${STATUS_STYLE[s.status as Status] ?? ""}`}>{s.status}</span>
                  {s.platformName && <span className="text-xs text-slate-400">{s.platformName}</span>}
                </div>
                <p className="text-sm text-slate-300">
                  {formatMoney(s.amount, s.currency)} {CYCLE_LABEL[s.billingCycle as Cycle]}
                  {s.billingCycle !== "monthly" && <span className="text-slate-400"> (≈ {formatMoney(s.monthlyEquivalent, s.currency)}/month)</span>}
                </p>
                <p className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                  {s.status === "trial" && s.trialEndDate && <span className="flex items-center gap-1"><CalendarClock size={12} aria-hidden /> Trial ends {s.trialEndDate}</span>}
                  {s.status === "active" && s.nextRenewalDate && <span className="flex items-center gap-1"><CalendarClock size={12} aria-hidden /> Renews {s.nextRenewalDate}</span>}
                  <span className="flex items-center gap-1"><Repeat size={12} aria-hidden /> {s.autoRecord ? "Recorded automatically" : "Not recorded"}</span>
                  {s.lastRecordedDate && <span>Last recorded {s.lastRecordedDate}</span>}
                </p>
              </div>
              {canWrite && (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`} className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white"><Pencil size={14} aria-hidden /></button>
                  <button type="button" onClick={() => setDeleteTarget(s)} aria-label={`Delete ${s.name}`} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-300 hover:text-red-300"><Trash2 size={14} aria-hidden /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-zinc-950/95 border border-white/[0.08] rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">{editTarget ? "Edit subscription" : "Add subscription"}</DialogTitle>
            <DialogDescription className="text-sm text-slate-300">Fields marked * are required.</DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={e => { e.preventDefault(); void handleSubmit(); }} className="space-y-4 py-2">
            {formError && <p role="alert" className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</p>}
            <div className="space-y-1.5">
              <label htmlFor="sub-name" className={labelClass}>Name *</label>
              <input id="sub-name" className={inputClass} placeholder="e.g. Claude Max" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label htmlFor="sub-amount" className={labelClass}>Price *</label>
                <input id="sub-amount" inputMode="decimal" className={inputClass} placeholder="20.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sub-currency" className={labelClass}>Currency</label>
                <input id="sub-currency" maxLength={3} className={`${inputClass} uppercase`} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="sub-cycle" className={labelClass}>Billed</label>
                <select id="sub-cycle" className={inputClass} value={form.billingCycle} onChange={e => setForm({ ...form, billingCycle: e.target.value as Cycle })}>
                  {(Object.keys(CYCLE_LABEL) as Cycle[]).map(c => <option key={c} value={c} className="bg-zinc-950">{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sub-status" className={labelClass}>Status</label>
                <select id="sub-status" className={inputClass} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}>
                  {(["active", "trial", "paused", "cancelled"] as Status[]).map(s => <option key={s} value={s} className="bg-zinc-950">{s}</option>)}
                </select>
              </div>
            </div>
            {form.status === "trial" ? (
              <div className="space-y-1.5">
                <label htmlFor="sub-trial" className={labelClass}>Trial ends *</label>
                <input id="sub-trial" type="date" className={inputClass} value={form.trialEndDate} onChange={e => setForm({ ...form, trialEndDate: e.target.value })} />
                <p className="text-xs text-slate-400">When the trial ends, the plan turns active and its first charge is recorded on this date.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="sub-next" className={labelClass}>Next charge date{form.status === "active" ? " *" : ""}</label>
                <input id="sub-next" type="date" className={inputClass} value={form.nextRenewalDate} onChange={e => setForm({ ...form, nextRenewalDate: e.target.value })} />
                <p className="text-xs text-slate-400">A past date records every renewal since then, so you can enter the date of your first charge to fill in history.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="sub-vendor" className={labelClass}>Vendor</label>
              <select id="sub-vendor" className={inputClass} value={form.platformId} onChange={e => setForm({ ...form, platformId: e.target.value })}>
                <option value="" className="bg-zinc-950">None</option>
                {vendors.map(v => <option key={v.id} value={v.id} className="bg-zinc-950">{v.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={form.autoRecord} onChange={e => setForm({ ...form, autoRecord: e.target.checked })} />
              Record each renewal as an expense automatically
            </label>
            <div className="space-y-1.5">
              <label htmlFor="sub-notes" className={labelClass}>Notes</label>
              <textarea id="sub-notes" className={`${inputClass} h-16 resize-none`} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <button type="button" onClick={() => setDialogOpen(false)} disabled={saving} className="px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">
                {saving ? "Saving…" : editTarget ? "Save changes" : "Add subscription"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={open => { if (!open && !deleteMutation.isPending) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm bg-zinc-950/95 border border-white/[0.08] rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription className="text-sm text-slate-300">No future renewals will be recorded. Charges already recorded stay in your expenses.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white">Cancel</button>
            <button type="button" onClick={() => void handleDelete()} disabled={deleteMutation.isPending} className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
