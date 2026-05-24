import React, { useState } from 'react';
import { 
  Zap, 
  ZapOff, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Plus, 
  Settings, 
  Clock, 
  CheckCircle2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function AutoPilot() {
  const [rules, setRules] = useState([
    { id: 1, name: 'Critical Burn Stop', trigger: 'Spend > 120% Budget', action: 'Kill Keys', status: 'Armed' },
    { id: 2, name: 'Soft Throttling', trigger: 'Spend > 80% Budget', action: 'Rate Limit 50%', status: 'Active' },
    { id: 3, name: 'Non-Production Freeze', trigger: 'After 8 PM PST', action: 'Disable Staging Keys', status: 'Paused' },
  ]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Budget Auto-Pilot</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Configure automated safeguards to protect your budget. Automatically throttle API keys or freeze non-critical environments when spend thresholds are breached.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Plus size={18} />
          New Safeguard
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Rules List */}
        <div className="lg:col-span-8 space-y-6">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    rule.status === 'Armed' ? 'bg-red-500/20 text-red-400' : 
                    rule.status === 'Active' ? 'bg-indigo-500/20 text-indigo-400' : 
                    'bg-slate-500/20 text-slate-500'
                  }`}>
                    {rule.action.includes('Kill') ? <ZapOff size={28} /> : <Zap size={28} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{rule.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        rule.status === 'Armed' ? 'text-red-400' : 
                        rule.status === 'Active' ? 'text-emerald-400' : 
                        'text-slate-500'
                      }`}>{rule.status}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-xs text-slate-500 font-medium">Automatic Execution Enabled</span>
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
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trigger Condition</div>
                  <div className="text-sm font-bold text-white">{rule.trigger}</div>
                </div>
                <div className="space-y-1 md:text-right">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Automated Action</div>
                  <div className="text-sm font-bold text-indigo-300">{rule.action}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-8">
              <ShieldCheck className="text-emerald-400" size={20} />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Safety Status</h3>
            </div>
            
            <div className="space-y-6">
              <SafetyMetric label="Engine Status" value="Online" status="good" />
              <SafetyMetric label="Latent Risk" value="Low" status="good" />
              <SafetyMetric label="Manual Override" value="Off" status="good" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600/20 to-orange-700/20 border border-red-500/20 rounded-[2.5rem] p-8">
            <AlertTriangle size={32} className="text-red-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Emergency Freeze</h3>
            <p className="text-xs text-red-200/60 leading-relaxed mb-6">
              Immediately disable ALL non-production API keys. This will halt all non-essential workflows globally.
            </p>
            <button className="w-full py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold text-xs transition-all shadow-lg">Initiate Global Freeze</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SafetyMetric({ label, value, status }: any) {
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
