import React, { useState } from 'react';
import { 
  MessageSquare, 
  Slack, 
  Bell, 
  Zap, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  X,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

export default function BotSettings() {
  const [channels, setChannels] = useState([
    { id: 1, platform: 'Slack', name: '#finops-alerts', triggers: ['Spikes', 'Budgets'], status: 'Active' },
    { id: 2, platform: 'Discord', name: 'Engineering Alerts', triggers: ['Anomalies'], status: 'Active' },
  ]);

  const addChannel = () => {
    toast.info("Connecting to Slack...");
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Communication Bot Settings</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Connect CostPilot to your team's workflow. Get real-time alerts in Slack or Discord whenever spend risks are detected.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={addChannel}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus size={18} />
            Connect Channel
          </button>
        </div>
      </header>

      {/* Main Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Active Connections */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Active Channels</h2>
          {channels.map((ch) => (
            <div key={ch.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${ch.platform === 'Slack' ? 'bg-[#4A154B]/20 text-[#4A154B]' : 'bg-[#5865F2]/20 text-[#5865F2]'}`}>
                    {ch.platform === 'Slack' ? <Slack size={28} /> : <MessageSquare size={28} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{ch.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{ch.status}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-xs text-slate-500 font-medium">{ch.platform} Integration</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all"><Settings size={18} /></button>
                  <button className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-red-400 transition-all"><X size={18} /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-white/[0.05]">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Active Triggers</div>
                  <div className="flex flex-wrap gap-2">
                    {ch.triggers.map(t => (
                      <span key={t} className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/10">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-end items-end">
                  <button className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                    Test Payload <RefreshCw size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Global Settings */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Alert Rules</h3>
            <div className="space-y-6">
              <ToggleItem label="Budget Thresholds" active />
              <ToggleItem label="Anomaly Detection" active />
              <ToggleItem label="Large Expense (> $100)" active />
              <ToggleItem label="Weekly Digest" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600/20 to-violet-700/20 border border-indigo-500/20 rounded-[2.5rem] p-8">
            <div className="flex items-center gap-4 mb-4">
              <Zap className="text-indigo-400" size={24} />
              <h3 className="text-lg font-bold text-white">Smart Summaries</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Enable AI-generated summaries for Slack alerts. Instead of raw data, the bot will send natural language explanations of what happened.
            </p>
            <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-50 transition-all shadow-lg">Enable AI Summaries</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleItem({ label, active = false }: any) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <span className={`text-xs font-bold transition-colors ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{label}</span>
      <div className={`w-10 h-5 rounded-full transition-all relative ${active ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-white/10'}`}>
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`} />
      </div>
    </div>
  );
}
