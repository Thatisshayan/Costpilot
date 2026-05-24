import React, { useState } from 'react';
import { 
  Zap, 
  ArrowRight, 
  RefreshCcw, 
  LineChart, 
  Activity, 
  ShieldCheck, 
  Bot,
  BrainCircuit,
  Settings2
} from 'lucide-react';

export default function LlmSwitcher() {
  const [targetModel, setTargetModel] = useState('GPT-4o-mini');
  
  const currentStack = [
    { name: 'Summary Engine', current: 'GPT-4o', usage: '1.2M tokens/mo', cost: 18.00 },
    { name: 'Customer Support', current: 'Claude 3 Opus', usage: '0.8M tokens/mo', cost: 60.00 },
    { name: 'Data Extraction', current: 'GPT-4', usage: '2.5M tokens/mo', cost: 75.00 },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AI Switcher Engine</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Simulate the cost impact of migrating workflows between models. Test cost-efficiency scenarios before changing your production API keys.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-bold text-sm hover:bg-white/[0.05] transition-all flex items-center gap-2">
            <Settings2 size={16} />
            Configure Providers
          </button>
        </div>
      </header>

      {/* Migration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 space-y-6">
          {currentStack.map((stack) => (
            <div key={stack.name} className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group overflow-hidden relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400">
                    <BrainCircuit size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{stack.name}</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>Currently: <span className="text-indigo-300">{stack.current}</span></span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span>{stack.usage}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Cost</div>
                    <div className="text-lg font-mono font-bold text-white">${stack.cost.toFixed(2)}</div>
                  </div>
                  <ArrowRight className="text-slate-700" size={20} />
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Simulated</div>
                    <div className="text-lg font-mono font-bold text-indigo-400">${(stack.cost * 0.15).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-white/[0.05] pt-6">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  <Zap size={14} />
                  Estimated Savings: 85%
                </div>
                <button className="px-5 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-indigo-500 hover:text-white transition-all">
                  Run Benchmark
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Control Sidebar */}
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Target Model</h3>
            <div className="space-y-3">
              {['GPT-4o-mini', 'Claude 3.5 Sonnet', 'Gemini 1.5 Flash', 'Llama 3 (Groq)'].map((m) => (
                <button 
                  key={m}
                  onClick={() => setTargetModel(m)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    targetModel === m ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-white/5 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="text-sm font-bold text-white">{m}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600/20 to-violet-700/20 border border-indigo-500/20 rounded-[2rem] p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-6 shadow-lg">
              <LineChart size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Total Potential Impact</h3>
            <div className="text-3xl font-black text-white mb-2">-$1,240<span className="text-lg font-medium text-slate-400">/yr</span></div>
            <p className="text-xs text-slate-400 mb-6">Based on your last 90 days of production telemetry.</p>
            <button className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold text-xs transition-all shadow-lg">Generate Full Report</button>
          </div>
        </div>
      </div>
    </div>
  );
}
