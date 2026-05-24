import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight 
} from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  trend?: "up" | "down";
  isUrgent?: boolean;
  highlight?: boolean;
  isLoading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({ 
  label, 
  value, 
  subtext, 
  icon, 
  trend, 
  isUrgent = false, 
  highlight = false,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 animate-pulse">
        <div className="w-10 h-10 bg-white/[0.05] rounded-xl mb-4" />
        <div className="h-8 bg-white/[0.05] rounded-lg mb-2 w-3/4" />
        <div className="h-4 bg-white/[0.05] rounded-lg w-1/2" />
      </div>
    );
  }

  return (
    <div className={`bg-white/[0.02] border ${
      isUrgent 
        ? 'border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.04)] bg-gradient-to-b from-red-500/[0.02] to-transparent' 
        : highlight 
          ? 'border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.04)] bg-gradient-to-b from-indigo-500/[0.02] to-transparent' 
          : 'border-white/[0.06]'
      } rounded-3xl p-6 backdrop-blur-md hover:bg-white/[0.04] transition-all group relative overflow-hidden`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center group-hover:scale-110 transition-transform ${highlight ? 'text-indigo-400' : ''}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${trend === 'up' ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
            {trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            12.7%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/[0.03] text-[10px] font-medium text-slate-500 flex items-center justify-between">
        {subtext}
        <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-400" />
      </div>
    </div>
  );
};
