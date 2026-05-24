import React from 'react';
import { 
  BrainCircuit, 
  TrendingUp, 
  ArrowRight, 
  Zap, 
  Activity, 
  Target, 
  CheckCircle2, 
  BarChart3,
  Cpu,
  Database
} from 'lucide-react';

export default function FineTuningRoi() {
  const models = [
    { name: 'Llama 3 (Fine-tuned)', base: 'Llama 3 (Base)', trainingCost: 1200, inferenceSavings: '65%', payoff: '3.2 months' },
    { name: 'Mistral 7B (Custom)', base: 'GPT-3.5 Turbo', trainingCost: 450, inferenceSavings: '88%', payoff: '1.4 months' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Fine-Tuning ROI Analyst</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Calculate the payback period of training custom models. Compare the upfront cost of fine-tuning against long-term inference savings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
            <Cpu size={18} />
            Simulate New Training
          </button>
        </div>
      </header>

      {/* Impact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Training Spend</div>
          <div className="text-2xl font-black text-white">$1,650.00</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Projected Annual Savings</div>
          <div className="text-2xl font-black text-emerald-400">$12,400.00</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Avg Payback Period</div>
          <div className="text-2xl font-black text-white">2.1 Months</div>
        </div>
      </div>

      {/* Model Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {models.map((m) => (
          <div key={m.name} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md group hover:bg-white/[0.03] transition-all relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <BrainCircuit size={28} />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Payback</div>
                <div className="text-sm font-bold text-emerald-400">{m.payoff}</div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{m.name}</h3>
            <p className="text-xs text-slate-500 mb-8">Replacing <span className="text-indigo-300 font-bold">{m.base}</span> for production workflows.</p>

            <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/[0.05]">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Training Investment</div>
                <div className="text-lg font-mono font-bold text-white">${m.trainingCost.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Inference Savings</div>
                <div className="text-lg font-mono font-bold text-emerald-400">{m.inferenceSavings}</div>
              </div>
            </div>

            {/* Background Accent */}
            <div className="absolute bottom-[-10%] right-[-10%] w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all" />
          </div>
        ))}
      </div>

      {/* Recommendation Card */}
      <div className="bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-10">
        <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg border border-indigo-500/30">
          <Zap size={40} />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-white mb-2">Fine-Tuning Recommendation</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-8">
            Your <span className="text-white font-bold">Document Summarization</span> project is spending <span className="text-white font-bold">$1,200/mo</span> on GPT-4. Fine-tuning <span className="text-indigo-300 font-bold uppercase tracking-widest">Llama 3-8B</span> for this specific task would cost <span className="text-white font-bold">$800</span> upfront but save <span className="text-emerald-400 font-bold">$900/mo</span> in ongoing costs.
          </p>
          <div className="flex items-center gap-4">
            <button className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold text-xs transition-all shadow-lg flex items-center gap-2">
              Start Feasibility Study <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
