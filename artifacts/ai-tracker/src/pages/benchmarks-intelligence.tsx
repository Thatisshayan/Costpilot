import React from 'react';
import { 
  Globe, 
  TrendingUp, 
  Target, 
  ArrowRight, 
  Zap, 
  Activity, 
  CheckCircle2, 
  Info,
  Layers,
  BarChart3,
  ShieldCheck,
  Search
} from 'lucide-react';

export default function MarketBenchmarks() {
  const benchmarks = [
    { name: 'GPT-4o (Standard)', yourRate: '$15.00/M', marketAvg: '$14.20/M', variance: '+5.6%', status: 'High' },
    { name: 'Claude 3.5 Sonnet', yourRate: '$3.00/M', marketAvg: '$3.00/M', variance: '0%', status: 'Parity' },
    { name: 'H100 (On-Demand)', yourRate: '$2.15/hr', marketAvg: '$2.35/hr', variance: '-8.5%', status: 'Efficient' },
    { name: 'Llama 3 70B (Managed)', yourRate: '$0.80/M', marketAvg: '$0.75/M', variance: '+6.6%', status: 'High' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Globe size={18} />
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Collective Intelligence Layer</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Market Intelligence Benchmarks</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            See how your AI infrastructure rates compare to the industry. Anonymized, crowdsourced data from 400+ enterprises to help you negotiate better vendor contracts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2">
            <ShieldCheck size={16} className="text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Privacy Protected: Anonymized</span>
          </div>
        </div>
      </header>

      {/* Main Benchmarking Table */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] overflow-hidden backdrop-blur-md mb-12">
        <div className="p-8 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target size={20} className="text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">Provider Rate Variance</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Last Updated: 2 Hours Ago
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-white/[0.01] border-b border-white/[0.05]">
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="py-6 px-8">Model / Resource</th>
              <th className="py-6 px-4">Your Rate</th>
              <th className="py-6 px-4">Market Average</th>
              <th className="py-6 px-4">Variance</th>
              <th className="py-6 px-8 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {benchmarks.map((b) => (
              <tr key={b.name} className="group hover:bg-white/[0.01] transition-colors">
                <td className="py-5 px-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                      <Layers size={18} />
                    </div>
                    <span className="text-sm font-bold text-white">{b.name}</span>
                  </div>
                </td>
                <td className="py-5 px-4 text-sm font-mono font-bold text-white">{b.yourRate}</td>
                <td className="py-5 px-4 text-sm font-mono font-bold text-slate-500">{b.marketAvg}</td>
                <td className="py-5 px-4">
                  <span className={`text-xs font-bold ${b.variance.startsWith('-') ? 'text-emerald-400' : b.variance === '0%' ? 'text-slate-400' : 'text-red-400'}`}>
                    {b.variance}
                  </span>
                </td>
                <td className="py-5 px-8 text-right">
                  <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                    b.status === 'Efficient' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    b.status === 'Parity' ? 'bg-white/5 text-slate-500 border-white/5' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Negotiation Insight Card */}
      <div className="bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-10">
        <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg border border-indigo-500/30">
          <TrendingUp size={40} />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white mb-2">Negotiation Intelligence</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-8">
            You are paying <span className="text-red-400 font-bold">5.6% more</span> for GPT-4 tokens than similar-sized enterprises. Based on our market data, you have enough volume to qualify for a <span className="text-white font-bold italic underline decoration-indigo-500 underline-offset-4">Tier 3 Enterprise Discount</span>.
          </p>
          <div className="flex items-center gap-4">
            <button className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold text-xs transition-all shadow-lg flex items-center gap-2">
              Generate Negotiation Deck <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
