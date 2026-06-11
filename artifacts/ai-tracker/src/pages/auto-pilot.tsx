import React, { useState, useCallback, useEffect } from 'react';
import {
  Zap,
  ZapOff,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Settings,
  X,
  Wallet,
  DollarSign,
  Bell,
  Sliders,
  Loader2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Gauge,
  Activity,
  Ban,
  ChevronDown,
  Sun,
  Moon,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  customFetch,
  useListProjects,
  useGetKpiSummary,
  getGetKpiSummaryQueryKey,
} from '@workspace/api-client-react';
import {
  ACTION_COLORS,
  SkeletonCard,
  EmptyState,
  BudgetAction,
} from './auto-pilot-utils';

interface BudgetPolicy {
  id: number;
  userId: string;
  workspaceId: number | null;
  projectId: number | null;
  name: string;
  thresholdAmount: number;
  action: BudgetAction;
  isActive: boolean;
  createdAt: string;
}

interface FormState {
  name: string;
  thresholdAmount: string;
  action: BudgetAction;
  projectId: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  thresholdAmount: '',
  action: 'warn',
  projectId: '',
  isActive: true,
};

export default function AutoPilot() {
  const qc = useQueryClient();

  const [policies, setPolicies] = useState<BudgetPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(true);
  const [evalResult, setEvalResult] = useState<{
    currentSpend: number;
    totalPolicies: number;
    triggered: Array<{ policy: BudgetPolicy; currentSpend: number; exceededBy: number }>;
  } | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  const { data: projects } = useListProjects();
  const { data: liveSummary, isLoading: kpiLoading } = useGetKpiSummary();
  const summary = liveSummary;

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await customFetch<BudgetPolicy[]>('/api/budgets', { method: 'GET' });
      setPolicies(data);
    } catch {
      toast.error('Failed to load budget policies');
    } finally {
      setLoading(false);
    }
  }, []);

  const runEvaluation = useCallback(async () => {
    try {
      setEvalLoading(true);
      const data = await customFetch<{
        currentSpend: number;
        totalPolicies: number;
        triggered: Array<{ policy: BudgetPolicy; currentSpend: number; exceededBy: number }>;
      }>('/api/budgets/evaluate', { method: 'GET' });
      setEvalResult(data);
    } catch {
      toast.error('Failed to evaluate budget policies');
    } finally {
      setEvalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    if (policies.length > 0) {
      runEvaluation();
    }
  }, [policies.length, runEvaluation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.thresholdAmount) {
      toast.error('Name and threshold are required');
      return;
    }
    try {
      setSubmitting(true);
      const body = {
        name: form.name,
        thresholdAmount: Number(form.thresholdAmount),
        action: form.action,
        isActive: form.isActive,
        projectId: form.projectId ? Number(form.projectId) : null,
      };

      if (editingId) {
        await customFetch(`/api/budgets/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        toast.success('Rule updated');
      } else {
        await customFetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        toast.success('Rule created');
      }

      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchPolicies();
      qc.invalidateQueries({ queryKey: getGetKpiSummaryQueryKey() });
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Operation failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (policy: BudgetPolicy) => {
    setForm({
      name: policy.name,
      thresholdAmount: String(policy.thresholdAmount),
      action: policy.action,
      projectId: policy.projectId ? String(policy.projectId) : '',
      isActive: policy.isActive,
    });
    setEditingId(policy.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await customFetch(`/api/budgets/${id}`, { method: 'DELETE' });
      toast.success('Rule deleted');
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error('Failed to delete rule');
    }
  };

  const handleToggleActive = async (policy: BudgetPolicy) => {
    try {
      const updated = await customFetch<BudgetPolicy>(`/api/budgets/${policy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !policy.isActive }),
      });
      setPolicies((prev) => prev.map((p) => (p.id === updated.id ? { ...updated, thresholdAmount: Number(updated.thresholdAmount) } : p)));
      toast.success(policy.isActive ? 'Rule paused' : 'Rule activated');
    } catch {
      toast.error('Failed to toggle rule');
    }
  };

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const triggeredCount = evalResult?.triggered?.length ?? 0;
  const budgetTotal = summary?.budgetTotal ?? 0;
  const monthToDateSpend = summary?.monthToDateSpend ?? 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Budget Auto-Pilot</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Automated safeguards that protect your budget. Define spend thresholds and let CostPilot automatically warn, block, or downgrade when limits are exceeded.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 shrink-0"
        >
          <Plus size={18} />
          Add Rule
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {kpiLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Budget</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Wallet size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-white">${budgetTotal.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 mt-2 font-medium">Monthly allocation</div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">MTD Spend</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-white">${monthToDateSpend.toLocaleString()}</div>
              <div className={`text-[10px] mt-2 font-bold flex items-center gap-1 ${monthToDateSpend > budgetTotal ? 'text-red-400' : 'text-emerald-400'}`}>
                {monthToDateSpend > budgetTotal ? (
                  <><ArrowUp size={12} /> Over budget</>
                ) : (
                  <><ArrowDown size={12} /> Within budget</>
                )}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Rules</span>
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                  <Sliders size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-white">{policies.filter((p) => p.isActive).length}</div>
              <div className="text-[10px] text-slate-500 mt-2 font-medium">
                {policies.length > 0 ? `${policies.length} total configured` : 'No rules set up'}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alerts Triggered</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${triggeredCount > 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-500/10 text-slate-400'}`}>
                  <Bell size={16} />
                </div>
              </div>
              {evalLoading ? (
                <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
              ) : (
                <div className={`text-2xl font-black ${triggeredCount > 0 ? 'text-red-400' : 'text-white'}`}>
                  {triggeredCount}
                </div>
              )}
              <div className="text-[10px] text-slate-500 mt-2 font-medium">This month</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        <div className="lg:col-span-8">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-8">
              <ShieldCheck className="text-indigo-400" size={20} />
              <h2 className="text-lg font-bold text-white">Budget Rules</h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 animate-pulse">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                        <div className="h-3 w-24 bg-white/10 rounded" />
                      </div>
                      <div className="h-6 w-14 bg-white/10 rounded-full" />
                    </div>
                    <div className="h-3 w-full bg-white/10 rounded mb-2" />
                    <div className="h-3 w-3/4 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            ) : policies.length === 0 ? (
              <EmptyState onAdd={openAddModal} />
            ) : (
              <div className="space-y-4">
                {policies.map((policy) => {
                  const colors = ACTION_COLORS[policy.action];
                  const usagePct = budgetTotal > 0 ? Math.round((monthToDateSpend / budgetTotal) * 100) : 0;
                  const thresholdPct = budgetTotal > 0 ? Math.round((policy.thresholdAmount / budgetTotal) * 100) : 0;
                  const isBreached = monthToDateSpend > policy.thresholdAmount;

                  return (
                    <div
                      key={policy.id}
                      className={`bg-white/[0.01] border rounded-2xl p-6 transition-all hover:bg-white/[0.02] ${
                        isBreached ? 'border-red-500/30' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text}`}>
                            {policy.action === 'block' ? <Ban size={22} /> : policy.action === 'downgrade' ? <ZapOff size={22} /> : <Activity size={22} />}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">{policy.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>
                                {colors.label}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <span className="text-[10px] text-slate-500 font-medium">
                                Threshold: ${policy.thresholdAmount.toLocaleString()}
                              </span>
                              {policy.projectId && projects && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-white/20" />
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    {projects.find((p: any) => p.id === policy.projectId)?.name || 'Unknown project'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => handleToggleActive(policy)}
                            className={`w-11 h-5 rounded-full transition-all relative cursor-pointer ${
                              policy.isActive ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)]' : 'bg-white/15'
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${
                                policy.isActive ? 'left-6' : 'left-0.5'
                              }`}
                            />
                          </div>
                          <button
                            onClick={() => handleEdit(policy)}
                            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all"
                          >
                            <Settings size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(policy.id)}
                            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          <span>Spend vs Threshold</span>
                          <span>
                            ${monthToDateSpend.toLocaleString()} / ${policy.thresholdAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isBreached
                                ? 'bg-gradient-to-r from-red-500 to-rose-600'
                                : usagePct > thresholdPct * 0.8
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                            }`}
                            style={{ width: `${Math.min((monthToDateSpend / policy.thresholdAmount) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {isBreached && (
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                          <AlertTriangle size={14} />
                          Budget exceeded by ${(monthToDateSpend - policy.thresholdAmount).toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-8">
              <Gauge className="text-emerald-400" size={20} />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Auto-Pilot Status</h3>
            </div>

            <div className="space-y-6 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Engine</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${autoPilotEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {autoPilotEnabled ? 'Active' : 'Paused'}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${autoPilotEnabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Rules</span>
                <span className="text-xs font-bold text-white">{policies.filter((p) => p.isActive).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alerts Fired</span>
                <span className={`text-xs font-bold ${triggeredCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{triggeredCount}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-t border-white/5">
              <span className="text-xs font-bold text-white">Enable Auto-Pilot</span>
              <div
                onClick={() => setAutoPilotEnabled(!autoPilotEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${
                  autoPilotEnabled ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/15'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${
                    autoPilotEnabled ? 'left-7' : 'left-1'
                  }`}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <button
                onClick={runEvaluation}
                disabled={evalLoading}
                className="w-full py-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-300 font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {evalLoading ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                Evaluate Now
              </button>
            </div>
          </div>

          {evalResult && triggeredCount > 0 && (
            <div className="bg-gradient-to-br from-red-600/20 to-rose-700/20 border border-red-500/20 rounded-[2.5rem] p-8">
              <AlertTriangle size={32} className="text-red-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Thresholds Breached</h3>
              <p className="text-xs text-red-200/60 leading-relaxed mb-4">
                {triggeredCount} rule{triggeredCount > 1 ? 's' : ''} currently triggered with spend at ${evalResult.currentSpend.toLocaleString()}.
              </p>
              <div className="space-y-2 mb-6">
                {evalResult.triggered.slice(0, 3).map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-black/30 rounded-xl px-4 py-2.5">
                    <div>
                      <div className="text-xs font-bold text-white">{t.policy.name}</div>
                      <div className="text-[10px] text-red-300/70">Exceeded by ${t.exceededBy.toLocaleString()}</div>
                    </div>
                    <span className={`text-[9px] px-2 py-1 ${ACTION_COLORS[t.policy.action].bg} ${ACTION_COLORS[t.policy.action].text} rounded-md font-bold uppercase`}>
                      {ACTION_COLORS[t.policy.action].label}
                    </span>
                  </div>
                ))}
              </div>
              <button className="w-full py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold text-xs transition-all shadow-lg">
                Review All Breaches
              </button>
            </div>
          )}

          {evalResult && triggeredCount === 0 && policies.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-600/10 to-teal-700/10 border border-emerald-500/20 rounded-[2.5rem] p-8">
              <CheckCircle2 size={32} className="text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">All Clear</h3>
              <p className="text-xs text-emerald-200/60 leading-relaxed">
                Current spend (${evalResult.currentSpend.toLocaleString()}) is within all {evalResult.totalPolicies} active budget thresholds.
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-white/10 rounded-[2rem] p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingId ? 'Edit Rule' : 'New Budget Rule'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="p-1 text-slate-500 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rule Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. OpenAI Spend Cap"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Threshold Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.thresholdAmount}
                  onChange={(e) => setForm({ ...form, thresholdAmount: e.target.value })}
                  placeholder="e.g. 1000"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</label>
                <select
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value as BudgetAction })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  <option value="warn">Warn — Notify team</option>
                  <option value="block">Block — Stop new spending</option>
                  <option value="downgrade">Downgrade — Switch to cheaper tier</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project (optional)</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  <option value="">All Projects</option>
                  {projects?.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-b border-white/5">
                <span className="text-xs font-bold text-white">Active</span>
                <div
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${
                    form.isActive ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.3)]' : 'bg-white/15'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${
                      form.isActive ? 'left-7' : 'left-1'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs border border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {editingId ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
