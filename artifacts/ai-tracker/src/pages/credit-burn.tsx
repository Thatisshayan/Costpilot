import React from 'react';
import { 
  Flame, 
  TrendingUp, 
  Clock, 
  Zap, 
  Target, 
  ArrowRight, 
  Activity, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle,
  Database
} from 'lucide-react';

export default function CreditBurn() {
  const credits = [
    { name: 'OpenAI Enterprise Credits', balance: '$12,450', burnRate: '$142/day', expiry: 'Oct 12, 2026', health: 'Healthy' },
    { name: 'Azure Sponsorship', balance: '$840', burnRate: '$12/day', expiry: 'July 01, 2026', health: 'Risk' },
    { name: 'Anthropic Credits', balance: '$2,100', burnRate: '$45/day', expiry: 'Jan 20, 2027', health: 'Healthy' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Credit Burn & Predictive Runway</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Track your prepaid AI credits across all providers. We forecast exactly when your credits will run dry based on current burn velocity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center gap-2">
            <Flame size={16} className="text-orange-400" />
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Avg. Runway: 142 Days</span>
          </div>
        </div>
      </header>

      {/* Credit Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {credits.map((c) => (
          <div key={c.name} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${c.health === 'Risk' ? 'bg-orange-500/20 text-orange-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                <Database size={24} />
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                c.health === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
              }`}>
                {c.health}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{c.name}</h3>
            <div className="text-3xl font-black text-white mb-6">{c.balance}</div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/[0.05]">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Burn Velocity</div>
                <div className="text-xs font-mono font-bold text-white">{c.burnRate}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Expires</div>
                <div className="text-xs font-mono font-bold text-slate-400">{c.expiry}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Predictive Visualisation Area */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-10 backdrop-blur-md relative overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Projected Resource Exhaustion</h2>
            <p className="text-xs text-slate-500">Based on seasonality-aware forecasting models.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Actual Burn</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500/30" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Forecasted</span>
            </div>
          </div>
        </div>
        <div className="h-64 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem] flex items-center justify-center text-slate-700 italic text-xs">
          Predictive Credit Runway Chart
        </div>
      </div>
    </div>
  );
}
