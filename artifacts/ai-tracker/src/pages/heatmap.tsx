import React from 'react';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Database, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Search,
  Filter,
  BarChart3,
  MousePointer2
} from 'lucide-react';

export default function UsageHeatmap() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Usage Density Heatmap</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Visualize your AI spend density across time, model, and department. Identify high-cost "hotspots" and optimize resource distribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2">
            <Activity size={16} className="text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Peak Load: 2:00 PM EST</span>
          </div>
        </div>
      </header>

      {/* Main Heatmap Canvas */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-10 backdrop-blur-md relative overflow-hidden mb-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Temporal Spend Intensity</h2>
            <p className="text-xs text-slate-500">Weekly view of API invocation frequency.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Low</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${i === 1 ? 'bg-indigo-950' : i === 2 ? 'bg-indigo-900' : i === 3 ? 'bg-indigo-700' : i === 4 ? 'bg-indigo-500' : 'bg-indigo-300'}`} />
                ))}
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase">High</span>
            </div>
          </div>
        </div>

        {/* Mock Heatmap Grid */}
        <div className="grid grid-cols-24 gap-1 h-64 mb-6">
          {[...Array(24 * 7)].map((_, i) => (
            <div 
              key={i} 
              className={`rounded-sm transition-all hover:scale-125 cursor-pointer ${
                i % 24 > 9 && i % 24 < 17 ? 'bg-indigo-500/40' : 
                i % 24 > 13 && i % 24 < 15 ? 'bg-indigo-400' : 
                'bg-white/5'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[8px] font-bold text-slate-700 uppercase tracking-widest">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
      </div>

      {/* Insight Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <MousePointer2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Cluster Analysis</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Your <span className="text-white font-bold">R&D Cluster</span> exhibits a recurring spend spike between 2 AM and 4 AM UTC. This correlates with scheduled batch processing jobs on <span className="text-indigo-300 font-bold">Azure OpenAI</span>.
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-600/20 to-violet-700/20 border border-indigo-500/20 rounded-[2.5rem] p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Off-Peak Opportunity</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Shift non-critical data processing to <span className="text-white font-bold italic">Off-Peak Windows</span> (10 PM - 4 AM) to leverage upcoming <span className="text-indigo-300 font-bold uppercase tracking-widest">Provider Spot Credits</span> and reduce effective cost by <span className="text-white font-bold">12%</span>.
          </p>
          <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
            View Schedule Planner <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
