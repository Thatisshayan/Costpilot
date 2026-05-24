import React from 'react';
import { 
  Target, 
  TrendingUp, 
  ArrowRight, 
  Zap, 
  PieChart, 
  CheckCircle2,
  Activity,
  ArrowUpRight
} from 'lucide-react';

export default function TokenRoi() {
  const projects = [
    { name: 'Customer Support Bot', cost: 450.20, conversion: '82%', roi: '+310%', impact: 'High' },
    { name: 'Code Pilot (Internal)', cost: 120.00, conversion: '94%', roi: '+120%', impact: 'Medium' },
    { name: 'Marketing Copy Gen', cost: 85.50, conversion: '12%', roi: '-15%', impact: 'Low' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Token-Level ROI</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Link AI spend directly to business outcomes. Track conversion rates, cost-per-successful-interaction, and overall project return on investment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Avg ROI: +182%</span>
          </div>
        </div>
      </header>

      {/* ROI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {projects.map((p) => (
          <div key={p.name} className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <Target size={24} />
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                p.impact === 'High' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-500/10 text-slate-500'
              }`}>
                {p.impact} Impact
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">Tracking via Conversion Webhook</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/[0.05]">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Cost</div>
                <div className="text-sm font-mono font-bold text-white">${p.cost.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Outcome ROI</div>
                <div className={`text-sm font-mono font-bold ${p.roi.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{p.roi}</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white/[0.03] rounded-2xl flex items-center justify-between">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Conversion Rate</div>
              <div className="text-sm font-black text-white">{p.conversion}</div>
            </div>

            {/* Background Accent */}
            <div className="absolute bottom-[-10%] right-[-10%] w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all" />
          </div>
        ))}
      </div>

      {/* Advanced Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost per Outcome */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Zap size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Cost per Successful Outcome</h2>
          </div>
          
          <div className="space-y-6">
            <OutcomeProgress label="Resolved Ticket" value="$0.12" percent={45} />
            <OutcomeProgress label="Successful PR" value="$2.40" percent={85} />
            <OutcomeProgress label="Qualified Lead" value="$5.12" percent={30} />
          </div>
        </div>

        {/* ROI Recommendation */}
        <div className="bg-gradient-to-br from-indigo-600/20 to-violet-700/20 border border-indigo-500/20 rounded-[2rem] p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg">
              <Activity size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Efficiency Analysis</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-8">
            Your <span className="text-white font-bold">Marketing Copy Gen</span> project has a negative ROI. We recommend migrating this workflow to <span className="text-indigo-300 font-bold uppercase">GPT-4o-mini</span> to reduce costs by <span className="text-white font-bold">88%</span> while maintaining acceptable copy quality.
          </p>
          <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold text-xs hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-lg">
            Apply Cost Optimization <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function OutcomeProgress({ label, value, percent }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-white">{label}</span>
        <span className="text-xs font-mono font-bold text-indigo-400">{value}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
