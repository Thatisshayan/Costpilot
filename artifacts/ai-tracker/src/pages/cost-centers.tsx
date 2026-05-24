import React from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Layers, 
  Target, 
  ArrowUpRight,
  TrendingUp,
  Package
} from 'lucide-react';

export default function CostCenters() {
  const centers = [
    { name: 'Core Infrastructure', owner: 'Alex Rivera', spend: 2450.50, budget: 3000, trend: '+5.2%', health: 'good' },
    { name: 'R&D Labs', owner: 'Jordan Chen', spend: 1200.00, budget: 1000, trend: '+12.7%', health: 'risk' },
    { name: 'Customer Support (AI Agent)', owner: 'Sarah Miller', spend: 850.75, budget: 1500, trend: '-2.1%', health: 'good' },
    { name: 'Marketing Automation', owner: 'Sarah Miller', spend: 420.00, budget: 500, trend: '+0.5%', health: 'good' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Cost Centers & Tagging</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Allocate AI spend to specific departments, teams, or projects. Use hierarchical tags to track ROI across your entire organization.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Plus size={18} />
          Create Center
        </button>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <MetricCard title="Untagged Spend" value="$124.50" trend="-15%" icon={<Layers size={20} />} />
        <MetricCard title="Most Active Center" value="Core Infra" trend="+5.2%" icon={<Target size={20} />} />
        <MetricCard title="Tagging Coverage" value="94.2%" trend="+2.1%" icon={<Package size={20} />} />
      </div>

      {/* Cost Centers Table */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">Allocation Matrix</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input type="text" placeholder="Search centers..." className="pl-9 pr-4 py-2 bg-black/40 border border-white/5 rounded-lg text-[10px] text-white focus:outline-none w-48" />
            </div>
            <button className="p-2 bg-white/5 rounded-lg text-slate-400"><Filter size={14} /></button>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-white/[0.01] border-b border-white/[0.05]">
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="py-6 px-8">Center Name</th>
              <th className="py-6 px-4">Owner</th>
              <th className="py-6 px-4">Current Spend</th>
              <th className="py-6 px-4">Budget Utilization</th>
              <th className="py-6 px-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {centers.map((c) => (
              <tr key={c.name} className="group hover:bg-white/[0.01] transition-colors">
                <td className="py-5 px-8">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-8 rounded-full ${c.health === 'risk' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <span className="text-sm font-bold text-white">{c.name}</span>
                  </div>
                </td>
                <td className="py-5 px-4 text-xs text-slate-400 font-medium">{c.owner}</td>
                <td className="py-5 px-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-mono font-bold text-white">${c.spend.toLocaleString()}</span>
                    <span className={`text-[10px] font-bold ${c.trend.startsWith('+') ? 'text-red-400' : 'text-emerald-400'}`}>{c.trend} vs last mo</span>
                  </div>
                </td>
                <td className="py-5 px-4">
                  <div className="w-full max-w-[120px]">
                    <div className="flex justify-between text-[10px] mb-1.5 font-bold uppercase tracking-tighter">
                      <span className="text-slate-500">{Math.round((c.spend/c.budget)*100)}%</span>
                      <span className="text-slate-400">${c.budget}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${c.health === 'risk' ? 'bg-red-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${Math.min(100, (c.spend/c.budget)*100)}%` }} 
                      />
                    </div>
                  </div>
                </td>
                <td className="py-5 px-8 text-right">
                  <button className="p-2 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, icon }: any) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${trend.startsWith('-') ? 'text-emerald-400' : 'text-red-400'}`}>
          <TrendingUp size={10} className={trend.startsWith('-') ? 'rotate-180' : ''} />
          {trend}
        </div>
      </div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</div>
      <div className="text-2xl font-black text-white tracking-tight">{value}</div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
    </div>
  );
}
