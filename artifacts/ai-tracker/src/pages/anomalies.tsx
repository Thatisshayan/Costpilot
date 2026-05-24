import React from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  Zap, 
  Activity, 
  ShieldAlert, 
  ArrowRight, 
  Search,
  Filter,
  BarChart2,
  BrainCircuit
} from 'lucide-react';

export default function AnomalyDetection() {
  const anomalies = [
    { id: 1, title: 'Ghost Spike: OpenAI GPT-4', description: 'Subtle 4.2% daily growth detected in non-business hours. Indicates a possible runaway background loop.', risk: 'High', impact: '+$842/mo if unchecked' },
    { id: 2, title: 'Regional Variance: Anthropic', description: 'Unexpected usage spike from US-West-2 endpoint compared to historical baseline.', risk: 'Medium', impact: '+$120/wk' },
    { id: 3, title: 'Shadow API Key Usage', description: 'Activity detected on a key not associated with any active project tags.', risk: 'Critical', impact: 'Security Risk' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Anomaly Detection 3.0</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            AI-driven pattern recognition to detect "Ghost Spikes" and shadow usage before they impact your monthly budget.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">3 Active Risks</span>
          </div>
        </div>
      </header>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
        {/* Detection Feed */}
        <div className="lg:col-span-8 space-y-6">
          {anomalies.map((a) => (
            <div key={a.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                    a.risk === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    <BrainCircuit size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{a.title}</h2>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Risk Level: {a.risk}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Projected Impact</div>
                  <div className={`text-sm font-mono font-bold ${a.risk === 'Critical' ? 'text-red-400' : 'text-amber-400'}`}>{a.impact}</div>
                </div>
              </div>
              
              <p className="text-sm text-slate-400 leading-relaxed mb-8 pr-12">
                {a.description}
              </p>

              <div className="flex items-center justify-between border-t border-white/[0.05] pt-6">
                <div className="flex items-center gap-4">
                  <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-[10px] transition-all shadow-lg">Investigate Trace</button>
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 font-bold text-[10px] transition-all">Dismiss False Positive</button>
                </div>
                <button className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all">
                  <ArrowRight size={18} />
                </button>
              </div>

              {/* Background Glow */}
              <div className={`absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full blur-3xl pointer-events-none ${
                a.risk === 'Critical' ? 'bg-red-500/5' : 'bg-amber-500/5'
              }`} />
            </div>
          ))}
        </div>

        {/* Global Stats Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-8">
              <Activity className="text-indigo-400" size={20} />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Real-time Pulse</h3>
            </div>
            
            <div className="space-y-6">
              <PulseMetric label="Request Entropy" value="Normal" status="good" />
              <PulseMetric label="Avg Token Latency" value="142ms" status="good" />
              <PulseMetric label="Cost Volatility" value="Elevated" status="warning" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600/20 to-orange-700/20 border border-red-500/20 rounded-[2.5rem] p-8">
            <ShieldAlert size={32} className="text-red-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Automated Safeguard</h3>
            <p className="text-xs text-red-200/60 leading-relaxed mb-6">
              Critical anomalies now trigger <span className="text-white font-bold uppercase tracking-tighter italic underline decoration-red-500">Auto-Throttling</span>. Our engine will temporarily rate-limit suspicious API keys to protect your budget.
            </p>
            <button className="w-full py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold text-xs transition-all shadow-lg">Manage Safeguards</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PulseMetric({ label, value, status }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${status === 'good' ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'good' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
      </div>
    </div>
  );
}
