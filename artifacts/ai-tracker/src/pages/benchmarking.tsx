import React from 'react';
import { 
  BarChart2, 
  TrendingDown, 
  Zap, 
  Activity, 
  Target, 
  ArrowRight, 
  Globe, 
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function Benchmarking() {
  const providers = [
    { name: 'OpenAI (GPT-4o)', cost: 0.12, success: '99.8%', latency: '142ms', efficiency: 'High' },
    { name: 'Anthropic (Claude 3.5)', cost: 0.15, success: '99.7%', latency: '215ms', efficiency: 'High' },
    { name: 'Google (Gemini 1.5)', cost: 0.08, success: '94.2%', latency: '850ms', efficiency: 'Medium' },
    { name: 'Groq (Llama 3)', cost: 0.02, success: '99.9%', latency: '40ms', efficiency: 'Ultra' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Performance Benchmarking</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Measure the real value of your AI spend. We calculate the cost-per-successful-interaction and compare efficiency across global providers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <Zap size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Efficiency Peak: Groq</span>
          </div>
        </div>
      </header>

      {/* Efficiency Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <BenchCard label="Avg. Cost / 1k Tokens" value="$0.12" trend="-4.2%" />
        <BenchCard label="Avg. Latency" value="184ms" trend="-15ms" />
        <BenchCard label="Success Rate" value="98.2%" trend="+0.5%" />
        <BenchCard label="Efficiency Index" value="9.4" trend="+1.2" />
      </div>

      {/* Benchmarking Table */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target size={20} className="text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">Cross-Provider Comparison</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Last 30 Days Telemetry
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-white/[0.01] border-b border-white/[0.05]">
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="py-6 px-8">Model / Provider</th>
              <th className="py-6 px-4">Cost per Outcome</th>
              <th className="py-6 px-4">Success Rate</th>
              <th className="py-6 px-4">Avg Latency</th>
              <th className="py-6 px-8 text-right">Efficiency Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {providers.map((p) => (
              <tr key={p.name} className="group hover:bg-white/[0.01] transition-colors">
                <td className="py-5 px-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400">
                      <Globe size={18} />
                    </div>
                    <span className="text-sm font-bold text-white">{p.name}</span>
                  </div>
                </td>
                <td className="py-5 px-4">
                  <div className="text-sm font-mono font-bold text-white">${p.cost.toFixed(2)}</div>
                </td>
                <td className="py-5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-white">{p.success}</span>
                    {parseFloat(p.success) < 95 && <AlertTriangle size={12} className="text-amber-500" />}
                  </div>
                </td>
                <td className="py-5 px-4 text-xs text-slate-400 font-medium">{p.latency}</td>
                <td className="py-5 px-8 text-right">
                  <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                    p.efficiency === 'Ultra' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    p.efficiency === 'High' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    'bg-white/5 text-slate-500 border-white/5'
                  }`}>
                    {p.efficiency}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Optimization Insight */}
      <div className="mt-8 p-10 bg-gradient-to-br from-emerald-600/10 to-teal-700/10 border border-emerald-500/20 rounded-[3rem] flex flex-col md:flex-row items-center gap-10 overflow-hidden relative group">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg border border-emerald-500/30">
          <Activity size={40} />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Latency-Cost Optimization</h3>
          <p className="text-sm text-slate-300 leading-relaxed mb-8">
            Switching your <span className="text-white font-bold">Data Extraction</span> pipeline from Gemini to <span className="text-emerald-300 font-bold uppercase tracking-widest">Groq (Llama 3)</span> would reduce latency by <span className="text-white font-bold">95%</span> and costs by <span className="text-white font-bold">75%</span> with equal success rates.
          </p>
          <div className="flex items-center gap-4">
            <button className="px-8 py-3 bg-white text-emerald-600 rounded-2xl font-bold text-xs hover:bg-emerald-50 transition-all shadow-lg flex items-center gap-2">
              Apply Recommendation <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {/* Decorative Background Elements */}
        <div className="absolute bottom-[-20%] right-[-5%] w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
      </div>
    </div>
  );
}

function BenchCard({ label, value, trend }: any) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 backdrop-blur-md group hover:bg-white/[0.04] transition-all">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-black text-white tracking-tight">{value}</div>
        <div className={`text-[10px] font-bold ${trend.startsWith('-') ? 'text-emerald-400' : 'text-emerald-400'}`}>
          {trend}
        </div>
      </div>
    </div>
  );
}
