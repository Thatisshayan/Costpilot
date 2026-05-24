import React, { useState } from 'react';
import { 
  Search, 
  Command, 
  ArrowRight, 
  Zap, 
  History, 
  TrendingUp, 
  Settings, 
  User, 
  Layout,
  Cpu,
  Database,
  X
} from 'lucide-react';

export default function SearchHub() {
  const [query, setQuery] = useState('');
  
  const recent = [
    { label: 'April AWS Invoice', category: 'Finance', icon: <Database size={14} /> },
    { label: 'Fine-tuning ROI Llama 3', category: 'Strategy', icon: <Cpu size={14} /> },
    { label: 'Security Audit Q2', category: 'Compliance', icon: <Settings size={14} /> },
  ];

  const commands = [
    { label: 'Go to Dashboard', shortcut: 'G D', icon: <Layout size={14} /> },
    { label: 'Create Budget Alert', shortcut: 'N B', icon: <Zap size={14} /> },
    { label: 'Invite Team Member', shortcut: 'I T', icon: <User size={14} /> },
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 pb-20 max-w-4xl mx-auto pt-20">
      {/* Command Bar */}
      <div className="bg-[#18181b] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-2xl">
        <div className="p-8 flex items-center gap-6 border-b border-white/5">
          <Search className="text-slate-500" size={28} />
          <input 
            type="text" 
            autoFocus
            placeholder="Search costs, projects, or run commands..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-2xl font-bold text-white focus:outline-none placeholder:text-slate-700"
          />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
            ESC
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-white/5">
          {/* Quick Results */}
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <History size={12} />
                Recent Activity
              </div>
              <div className="space-y-2">
                {recent.map(r => (
                  <SearchItem key={r.label} icon={r.icon} label={r.label} category={r.category} />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={12} />
                Common Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {['OpenAI Usage', 'Claude Cost', 'API Keys', 'IAM Roles', 'Xero Export'].map(t => (
                  <span key={t} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-indigo-500/20 hover:border-indigo-500/20 cursor-pointer transition-all">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Commands */}
          <div className="p-8 space-y-8 bg-white/[0.01]">
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Command size={12} />
                Navigation Commands
              </div>
              <div className="space-y-2">
                {commands.map(c => (
                  <div key={c.label} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                        {c.icon}
                      </div>
                      <span className="text-sm font-bold text-white">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {c.shortcut.split(' ').map(s => (
                        <kbd key={s} className="px-2 py-1 rounded bg-black/60 border border-white/10 text-[8px] font-mono text-slate-500">{s}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem]">
              <div className="flex items-center gap-3 mb-2 text-indigo-400">
                <Zap size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Pro Tip</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Press <code className="text-indigo-300 font-bold px-1 bg-indigo-500/10 rounded">CMD + K</code> anywhere in the app to open the Command Palette instantly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchItem({ icon, label, category }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
          {icon}
        </div>
        <div>
          <div className="text-sm font-bold text-white">{label}</div>
          <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{category}</div>
        </div>
      </div>
      <ArrowRight className="text-slate-700 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" size={14} />
    </div>
  );
}
