import { BarChart3, Copy, AlertTriangle, DollarSign, LayoutDashboard } from 'lucide-react';

export type BudgetAction = 'warn' | 'block' | 'downgrade';

export const ACTION_COLORS: Record<BudgetAction, { bg: string; text: string; border: string; label: string }> = {
  warn: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/20', label: 'Warn' },
  block: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20', label: 'Block' },
  downgrade: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/20', label: 'Downgrade' },
};

export function SkeletonCard() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-24 bg-white/10 rounded" />
        <div className="w-8 h-8 rounded-xl bg-white/10" />
      </div>
      <div className="h-8 w-28 bg-white/10 rounded mb-2" />
      <div className="h-3 w-20 bg-white/10 rounded" />
    </div>
  );
}

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
        <BarChart3 size={32} />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">No budget rules yet</h3>
      <p className="text-slate-400 text-sm max-w-md mb-6">
        Create your first auto-pilot rule to automatically protect your budget when spend exceeds thresholds.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg"
      >
        <Copy size={18} />
        Add Your First Rule
      </button>
    </div>
  );
}