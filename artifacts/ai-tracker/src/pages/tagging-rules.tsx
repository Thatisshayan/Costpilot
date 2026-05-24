import React from 'react';
import { 
  Tag, 
  Settings, 
  Plus, 
  Database, 
  Bot, 
  ArrowRight, 
  CheckCircle2, 
  Clock,
  Filter,
  Search,
  X
} from 'lucide-react';

export default function TaggingRules() {
  const rules = [
    { id: 1, name: 'Project Alpha Auto-Tag', trigger: 'API Key ends in ...X92', target: 'Project Alpha', status: 'Active' },
    { id: 2, name: 'Department: Engineering', trigger: 'Provider is Groq', target: 'Engineering', status: 'Active' },
    { id: 3, name: 'Regional: EU-West', trigger: 'Endpoint contains .eu.', target: 'EU Operations', status: 'Paused' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Hierarchical Tagging Rules</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Automate your cost allocation with smart tagging rules. Link API usage to projects and departments without manual intervention.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Plus size={18} />
          Create Rule
        </button>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400">
                    <Tag size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{rule.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${rule.status === 'Active' ? 'text-emerald-400' : 'text-slate-500'}`}>{rule.status}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-xs text-slate-500 font-medium italic">Rule Priority: {rule.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all"><Settings size={18} /></button>
                  <button className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-red-400 transition-all"><X size={18} /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/[0.05]">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">When Condition Matches</div>
                  <div className="text-sm font-bold text-white italic">"{rule.trigger}"</div>
                </div>
                <div className="space-y-1 md:text-right">
                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Apply Tag</div>
                  <div className="text-sm font-bold text-indigo-300">{rule.target}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">AI Suggester</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              CostPilot detected <span className="text-white font-bold">142 untagged events</span> from <span className="text-indigo-300 font-bold">Azure</span>. Should we create a rule to tag these as 'Staging'?
            </p>
            <button className="w-full py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 font-bold text-[10px] hover:bg-indigo-500 hover:text-white transition-all">Generate Suggeted Rule</button>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Tag Coverage</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: '92%' }} />
              </div>
              <span className="text-xs font-bold text-white">92%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
