import React from 'react';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  LayoutGrid, 
  ChevronRight,
  Database,
  Search,
  Settings
} from 'lucide-react';

export default function MultiEntity() {
  const entities = [
    { id: 1, name: 'StartupAI (Parent)', type: 'Holding', spend: 8540.20, projects: 12, status: 'Healthy' },
    { id: 2, name: 'SupportAgent.io', type: 'Subsidiary', spend: 1250.00, projects: 4, status: 'Active' },
    { id: 3, name: 'Marketing Labs LLC', type: 'Affiliate', spend: 420.75, projects: 2, status: 'Active' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Multi-Entity Workspaces</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Manage multiple business entities, subsidiaries, or separate legal units from a single consolidated dashboard.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Plus size={18} />
          Add Entity
        </button>
      </header>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Consolidated Spend</h2>
              <p className="text-xs text-slate-500">Aggregated across all 3 entities.</p>
            </div>
          </div>
          <div className="text-4xl font-black text-white">$10,210.95</div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest">
            <CheckCircle2 size={14} />
            Unified Billing Enabled
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Seats</span>
            <span className="text-xs font-bold text-white">42 / 50</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '84%' }} />
          </div>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            Entities share a single <span className="text-indigo-300 font-bold uppercase">Enterprise Pool</span> of developer seats and API tokens.
          </p>
        </div>
      </div>

      {/* Entity Table */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database size={20} className="text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">Entity Roster</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input type="text" placeholder="Search entities..." className="pl-9 pr-4 py-2 bg-black/40 border border-white/5 rounded-lg text-[10px] text-white focus:outline-none w-48" />
            </div>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-white/[0.01] border-b border-white/[0.05]">
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="py-6 px-8">Entity Name</th>
              <th className="py-6 px-4">Type</th>
              <th className="py-6 px-4">Entity Spend</th>
              <th className="py-6 px-4">Projects</th>
              <th className="py-6 px-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {entities.map((e) => (
              <tr key={e.id} className="group hover:bg-white/[0.01] transition-colors">
                <td className="py-5 px-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center font-bold text-slate-300 border border-white/5">
                      {e.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{e.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">{e.status}</div>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-4">
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-white/5">
                    {e.type}
                  </span>
                </td>
                <td className="py-5 px-4">
                  <div className="text-sm font-mono font-bold text-white">${e.spend.toLocaleString()}</div>
                </td>
                <td className="py-5 px-4 text-xs text-slate-500 font-medium">
                  {e.projects} Projects
                </td>
                <td className="py-5 px-8 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"><Settings size={16} /></button>
                    <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
