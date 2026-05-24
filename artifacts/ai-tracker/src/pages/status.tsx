import React from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  BarChart, 
  Zap,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function PublicStatus() {
  const providers = [
    { name: 'OpenAI (API)', status: 'operational', latency: '142ms', uptime: '99.98%' },
    { name: 'Anthropic (Claude)', status: 'operational', latency: '215ms', uptime: '99.95%' },
    { name: 'Google Gemini API', status: 'degraded', latency: '850ms', uptime: '99.90%' },
    { name: 'Midjourney', status: 'operational', latency: '—', uptime: '99.99%' },
    { name: 'Runway Gen-3', status: 'operational', latency: '—', uptime: '99.94%' },
  ];

  const statusMap = {
    operational: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: <CheckCircle2 size={16} />, label: 'Operational' },
    degraded: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <Clock size={16} />, label: 'Degraded Performance' },
    outage: { color: 'text-red-400', bg: 'bg-red-500/10', icon: <XCircle size={16} />, label: 'Major Outage' },
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">All Systems Operational</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AI Infrastructure Status</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Real-time monitoring of global AI providers. We track uptime and latency to help you correlate service quality with API spend.
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-bold text-sm hover:bg-white/[0.05] transition-all">
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </header>

      {/* Main Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {providers.map((p) => (
          <div key={p.name} className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-white">{p.name}</span>
              <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${statusMap[p.status as keyof typeof statusMap].bg} ${statusMap[p.status as keyof typeof statusMap].color}`}>
                {statusMap[p.status as keyof typeof statusMap].icon}
                <span className="text-[10px] font-black uppercase tracking-wider">{statusMap[p.status as keyof typeof statusMap].label}</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.05] pt-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Latency</span>
                <span className="text-sm font-mono font-bold text-white">{p.latency}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">24h Uptime</span>
                <span className="text-sm font-mono font-bold text-white">{p.uptime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Uptime History Chart Placeholder */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md mb-12 overflow-hidden relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <BarChart size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Consolidated Uptime History</h2>
              <p className="text-xs text-slate-500">Last 90 days across all connected AI services.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Target: 99.9%</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
        </div>
        
        {/* Mock Chart Visualization */}
        <div className="flex items-end gap-1 h-32 mb-4">
          {[...Array(90)].map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-sm transition-all hover:scale-y-125 ${
                i === 45 || i === 78 ? 'bg-amber-500/40 h-[60%]' : 
                i === 12 ? 'bg-red-500/40 h-[40%]' : 
                'bg-emerald-500/20 h-full'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase tracking-widest">
          <span>90 Days Ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Intelligence Insight */}
      <div className="bg-gradient-to-br from-amber-600/10 to-orange-700/10 border border-amber-500/20 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-10">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-lg border border-amber-500/30">
          <Zap size={32} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-2">Uptime-Cost Correlation</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Gemini API degradation detected. Your 'R&D' project experienced <span className="text-amber-300 font-bold uppercase">41% increased latency</span> which led to a <span className="text-white font-bold underline decoration-amber-500 underline-offset-4">12% drop</span> in expected daily spend due to failed retries.
          </p>
          <div className="flex items-center gap-4">
            <button className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/10 transition-all">View Correlation Report</button>
          </div>
        </div>
      </div>
    </div>
  );
}
