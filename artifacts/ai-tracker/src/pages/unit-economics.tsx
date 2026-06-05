import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Target, 
  ArrowUpRight, 
  Zap, 
  Activity, 
  BarChart3, 
  CheckCircle2, 
  PieChart, 
  Users, 
  ShoppingBag,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { useListExpenses, useListPlatforms } from '@workspace/api-client-react';
import { Skeleton } from "@/components/ui/skeleton";

const MOCK_METRICS = [
  { label: 'Cost per Active User', value: '$0.42', trend: '-12%', sub: 'vs last month' },
  { label: 'Cost per Transaction', value: '$0.08', trend: '+4%', sub: 'vs last month' },
  { label: 'AI Margin Impact', value: '14.2%', trend: '+2.1%', sub: 'Net profit shift' },
  { label: 'Token LTV:CAC', value: '8.4x', trend: '+0.5x', sub: 'Efficiency score' },
];

const MOCK_PROVIDERS = [
  { name: 'OpenAI', totalSpend: 4820.50, txCount: 142, avgCost: 33.95 },
  { name: 'Anthropic', totalSpend: 2150.00, txCount: 68, avgCost: 31.62 },
  { name: 'AWS Bedrock', totalSpend: 3100.00, txCount: 95, avgCost: 32.63 },
];

export default function UnitEconomics() {
  const { data: liveExpenses, isLoading: expLoading } = useListExpenses();
  const { data: livePlatforms, isLoading: platLoading } = useListPlatforms();

  const isLoading = expLoading || platLoading;

  const providerMetrics = useMemo(() => {
    if (!liveExpenses || liveExpenses.length === 0) return null;
    const platformMap = new Map<number | string, { name: string; totalSpend: number; txCount: number }>();
    if (livePlatforms) {
      for (const p of livePlatforms) {
        platformMap.set(p.id, { name: p.name, totalSpend: 0, txCount: 0 });
      }
    }
    for (const e of liveExpenses) {
      const key = e.platformId ?? e.platformName ?? 'Unknown';
      if (!platformMap.has(key)) {
        platformMap.set(key, { name: e.platformName ?? 'Unknown', totalSpend: 0, txCount: 0 });
      }
      const entry = platformMap.get(key)!;
      entry.totalSpend += Number(e.amount) || 0;
      entry.txCount += 1;
    }
    return Array.from(platformMap.values())
      .filter(p => p.txCount > 0)
      .map(p => ({
        name: p.name,
        totalSpend: p.totalSpend,
        txCount: p.txCount,
        avgCost: p.totalSpend / p.txCount,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [liveExpenses, livePlatforms]);

  const hasRealData = providerMetrics && providerMetrics.length > 0;
  const displayProviders = hasRealData ? providerMetrics : MOCK_PROVIDERS;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign size={18} />
            </div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Financial Performance Layer</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Unit Economics Engine</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Go beyond infrastructure costs. Correlation of AI spend with business outcomes to calculate true profitability per feature, user, and transaction.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm hover:bg-white/10 transition-all flex items-center gap-2">
            <Activity size={18} />
            Connect Stripe Data
          </button>
        </div>
      </header>

      {/* Provider Spend Breakdown */}
      <div className="mb-16">
        <h2 className="text-xl font-bold text-white mb-6">Per-Provider Spend Analysis</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
                <Skeleton className="h-5 w-32 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : displayProviders.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-12 backdrop-blur-md text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-6">
              <BarChart3 size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Spend Data Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Connect platforms and log expenses to see per-provider unit economics here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProviders.map((p) => (
              <div key={p.name} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md relative group overflow-hidden">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{p.name}</div>
                <div className="text-3xl font-black text-white tracking-tight mb-1">
                  ${p.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                  <span>{p.txCount} transactions</span>
                  <span className="text-emerald-400 font-medium">${p.avgCost.toFixed(2)} avg/tx</span>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        {MOCK_METRICS.map((m) => (
          <div key={m.label} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md relative group overflow-hidden">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{m.label}</div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-black text-white tracking-tight">{m.value}</div>
              <div className={`text-[10px] font-bold ${m.trend.startsWith('-') ? 'text-emerald-400' : 'text-red-400'}`}>
                {m.trend}
              </div>
            </div>
            <div className="text-[10px] text-slate-600 font-medium mt-1">{m.sub}</div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
          </div>
        ))}
      </div>

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Margin Analysis Chart Area */}
        <div className="lg:col-span-8 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-10 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Feature Profitability Matrix</h2>
              <p className="text-xs text-slate-500">Net revenue vs. AI inference cost per feature.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">AI Cost</span>
              </div>
            </div>
          </div>
          <div className="h-72 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem] flex items-center justify-center text-slate-700 italic text-xs">
            Multi-Variable Feature Efficiency Chart
          </div>
        </div>

        {/* Strategic Insight */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-emerald-600/20 to-teal-700/20 border border-emerald-500/20 rounded-[3rem] p-10">
            <h3 className="text-lg font-bold text-white mb-6">Unit Insight</h3>
            <p className="text-sm text-emerald-100/70 leading-relaxed mb-8 italic">
              "Your 'AI Chat' feature has a <span className="text-white font-bold">12% lower gross margin</span> than your other features. Switching to <span className="text-emerald-300 font-bold uppercase">Claude 3 Haiku</span> for non-premium users would restore <span className="text-white font-bold">$4,200</span> in monthly margin."
            </p>
            <button className="w-full py-4 bg-white text-emerald-600 rounded-2xl font-bold text-xs hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-lg">
              Apply Tiering Strategy <ArrowRight size={14} />
            </button>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Attribution Health</h3>
            <div className="space-y-4">
              <AttributionRow label="User ID Tagging" value="98.2%" status="good" />
              <AttributionRow label="Stripe Metadata" value="74.1%" status="warning" />
              <AttributionRow label="Feature Mapping" value="100%" status="good" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttributionRow({ label, value, status }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'good' ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'good' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </div>
    </div>
  );
}
