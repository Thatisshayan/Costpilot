import React from 'react';
import { 
  BarChart3, 
  Cpu, 
  Zap, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Calculator
} from 'lucide-react';

interface ModelMetric {
  name: string;
  provider: string;
  inputCost: number; // per 1M tokens
  outputCost: number; // per 1M tokens
  contextWindow: string;
  strength: string;
  bestFor: string;
}

export default function VendorComparison() {
  const models: ModelMetric[] = [
    { name: 'GPT-4o', provider: 'OpenAI', inputCost: 5.00, outputCost: 15.00, contextWindow: '128k', strength: 'Reasoning', bestFor: 'Complex tasks' },
    { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', inputCost: 3.00, outputCost: 15.00, contextWindow: '200k', strength: 'Coding/Nuance', bestFor: 'Development' },
    { name: 'GPT-4o-mini', provider: 'OpenAI', inputCost: 0.15, outputCost: 0.60, contextWindow: '128k', strength: 'Speed/Cost', bestFor: 'Simple automation' },
    { name: 'Gemini 1.5 Pro', provider: 'Google', inputCost: 3.50, outputCost: 10.50, contextWindow: '2M', strength: 'Context Window', bestFor: 'Large documents' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Vendor Comparison Matrix</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Compare model performance vs. cost efficiency to optimize your AI infrastructure spend.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-bold text-sm hover:bg-white/[0.05] transition-all flex items-center gap-2 shadow-lg">
            <Calculator size={18} />
            Token Calculator
          </button>
        </div>
      </header>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {models.map((model) => (
          <div key={model.name} className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md hover:bg-white/[0.04] transition-all group relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400">
                <Cpu size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{model.provider}</span>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">{model.name}</h3>
            <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-6">{model.strength}</p>
            
            <div className="space-y-4 mb-8">
              <CostMetric label="Input (1M)" value={`$${model.inputCost.toFixed(2)}`} />
              <CostMetric label="Output (1M)" value={`$${model.outputCost.toFixed(2)}`} />
              <div className="flex justify-between items-center text-[10px] border-t border-white/[0.05] pt-4">
                <span className="text-slate-500 font-bold uppercase">Context</span>
                <span className="text-white font-bold">{model.contextWindow}</span>
              </div>
            </div>

            <div className="p-3 bg-white/[0.03] rounded-xl mb-6">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Best For</div>
              <div className="text-xs text-slate-300 font-medium">{model.bestFor}</div>
            </div>

            <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              View Pricing Detail <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Analysis Card */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-violet-700/20 border border-indigo-500/20 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-10">
        <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg border border-indigo-500/30">
          <BarChart3 size={40} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">Cost-Efficiency Analysis</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Based on your last 30 days of activity, switching your 'Summary' tasks to <span className="text-indigo-300 font-bold uppercase">GPT-4o-mini</span> would reduce your OpenAI bill by <span className="text-white font-bold underline decoration-indigo-500 decoration-2 underline-offset-4">$214.50</span> without impacting latency.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-xs transition-all shadow-lg">Apply Recommendation</button>
            <button className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-xs transition-all">Detailed Breakdown</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostMetric({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-sm font-mono font-bold text-white">{value}</div>
    </div>
  );
}
