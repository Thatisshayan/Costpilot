import React from 'react';
import { 
  TrendingUp, 
  Target, 
  ArrowUpRight, 
  Zap, 
  Activity, 
  BarChart3, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  ShieldCheck,
  ZapOff,
  Loader2
} from 'lucide-react';
import { useGetKpiSummary } from '@workspace/api-client-react';
import type { DashboardSummary } from '@workspace/api-client-react';

const MOCK_KPI = {
  totalAiSpend: 87450,
  monthToDateSpend: 12450,
  activeAiTools: 23,
  monthToDateChangePercent: 12.4,
  renewalsThisWeek: 4,
  upcomingRenewalAmount: 2480,
  apiSpendToday: 420,
  activeToolsUnusedCount: 3,
  budgetUsedPercent: 78,
  budgetTotal: 15000,
  forecastTotal: 16200,
  totalSavingsFound: 3400,
};

export default function FounderDashboard() {
  const { data: liveSummary, isLoading } = useGetKpiSummary();
  const summary: DashboardSummary = liveSummary ?? MOCK_KPI;

  if (isLoading) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg border border-indigo-500/20">
              <Target size={24} />
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Executive View</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Founder Mode Dashboard</h1>
          <p className="text-slate-500 text-sm max-w-xl">High-level visibility into AI ROI, runway impact, and strategic efficiency.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md animate-pulse">
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/5" />
                <div className="h-3 w-12 bg-white/5 rounded" />
              </div>
              <div className="h-3 w-20 bg-white/5 rounded mb-2" />
              <div className="h-8 w-24 bg-white/5 rounded mb-1" />
              <div className="h-3 w-16 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg border border-indigo-500/20">
            <Target size={24} />
          </div>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Executive View</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">Founder Mode Dashboard</h1>
        <p className="text-slate-500 text-sm max-w-xl">
          High-level visibility into AI ROI, runway impact, and strategic efficiency. No noise, just the metrics that move the needle.
        </p>
      </header>

      {/* Strategic KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <FounderKpi label="Total AI Spend" value={`$${(summary.totalAiSpend / 1000).toFixed(1)}K`} trend={`+${summary.monthToDateChangePercent}%`} icon={<TrendingUp size={20} />} />
        <FounderKpi label="Est. Runway Impact" value={`-${Math.round((summary.forecastTotal ?? summary.budgetTotal) / summary.budgetTotal * 30)} Days`} sub="Monthly Burn" icon={<Clock size={20} />} />
        <FounderKpi label="Efficiency Peak" value="9.8/10" sub="Model Mix" icon={<Zap size={20} />} />
        <FounderKpi label="Trust Score" value="A+" sub="Compliance" icon={<ShieldCheck size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Burn Velocity Chart Area */}
        <div className="lg:col-span-8 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-10 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Burn Velocity vs. Growth</h2>
              <p className="text-xs text-slate-500">Correlating AI spend with user acquisition. <span className="text-indigo-400">${summary.apiSpendToday ?? 0} spent today.</span></p>
            </div>
            <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">View Attribution</button>
          </div>
          <div className="h-64 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem] flex items-center justify-center text-slate-700 italic text-xs">
            Multi-Axis Performance Chart
          </div>
        </div>

        {/* Strategic Recommendations */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-indigo-600/20 to-violet-700/20 border border-indigo-500/20 rounded-[3rem] p-10">
            <h3 className="text-lg font-bold text-white mb-6">Founder Insight</h3>
            <p className="text-sm text-indigo-100/70 leading-relaxed mb-8 italic">
              "Your AI spend is growing <span className="text-white font-bold">2.4x faster</span> than your revenue. Migrating 'Internal Tools' to <span className="text-indigo-300 font-bold uppercase">Llama 3</span> would reclaim <span className="text-white font-bold">14 days</span> of runway per year."
            </p>
            <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold text-xs hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-lg">
              Execute Strategy <ArrowRight size={14} />
            </button>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Priority Risks</h3>
            <div className="space-y-4">
              <RiskRow label="Claude Opus Burn" status="Critical" />
              <RiskRow label="Untagged AWS Lambda" status="Warning" />
              <RiskRow label="API Key Leak Risk" status="Low" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FounderKpi({ label, value, trend, sub, icon }: any) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md relative group overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors shadow-inner">
          {icon}
        </div>
        {trend && <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{trend}</div>}
      </div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-3xl font-black text-white tracking-tight mb-1">{value}</div>
      {sub && <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{sub}</div>}
    </div>
  );
}

function RiskRow({ label, status }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
        status === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
        status === 'Warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      }`}>
        {status}
      </span>
    </div>
  );
}
