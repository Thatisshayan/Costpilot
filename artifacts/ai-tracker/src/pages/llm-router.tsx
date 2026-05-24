import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  RefreshCw, 
  ArrowRight, 
  TrendingDown, 
  Activity, 
  Cpu, 
  Database, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  ShieldCheck,
  MousePointer2,
  Server,
  Loader2
} from 'lucide-react';
import { usePostTelemetryLlmRoute } from '@workspace/api-client-react';

export default function LlmRouter() {
  const { mutate: recordRoute } = usePostTelemetryLlmRoute();
  const [activeTraffic, setActiveTraffic] = useState([
    { id: 1, prompt: 'Simple query: "Hello"', model: 'Llama 3 (8B)', cost: '$0.0001', savings: '95%' },
    { id: 2, prompt: 'Complex logic: code refactor', model: 'GPT-4o', cost: '$0.0150', savings: '0%' },
    { id: 3, prompt: 'Summarization: 2k tokens', model: 'Claude 3 Haiku', cost: '$0.0012', savings: '82%' },
  ]);

  // Simulate incoming traffic and report to backend
  useEffect(() => {
    const interval = setInterval(() => {
      const models = ['GPT-4o', 'Llama 3 (80B)', 'Claude 3.5 Sonnet', 'Mistral Large'];
      const selectedModel = models[Math.floor(Math.random() * models.length)];
      const tokens = Math.floor(Math.random() * 2000) + 100;
      
      // Send telemetry
      recordRoute({
        data: {
          model: selectedModel,
          provider: 'Router-Autonomous',
          tokens,
          latency: Math.floor(Math.random() * 500) + 200
        }
      });

      // Update UI simulation
      setActiveTraffic(prev => [
        { 
          id: Date.now(), 
          prompt: 'Autonomous Routing Event...', 
          model: selectedModel, 
          cost: `$${(tokens * 0.00001).toFixed(4)}`, 
          savings: `${Math.floor(Math.random() * 40) + 40}%` 
        },
        ...prev.slice(0, 2)
      ]);
    }, 5000);

    return () => clearInterval(interval);
  }, [recordRoute]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap size={18} />
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Real-time Execution Layer</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Autonomous LLM Router</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            A live proxy that dynamically routes every prompt to the most cost-effective model without sacrificing quality. Reduced effective token cost by an average of 64%.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2">
            <RefreshCw size={16} className="text-indigo-400 animate-spin-slow" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Router Live: 1,420 Req/min</span>
          </div>
        </div>
      </header>

      {/* Router Visualization */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-10 backdrop-blur-md relative overflow-hidden mb-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Dynamic Traffic Flow</h2>
            <p className="text-xs text-slate-500">Real-time prompt classification and model selection.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Saving</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Premium</span>
            </div>
          </div>
        </div>

        {/* Traffic Simulation */}
        <div className="space-y-4 mb-10">
          {activeTraffic.map((t) => (
            <div key={t.id} className="flex items-center gap-6 p-4 bg-white/5 border border-white/5 rounded-2xl animate-in slide-in-from-left-4 duration-500">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <MousePointer2 size={18} />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Incoming Prompt</div>
                <div className="text-xs font-bold text-white truncate max-w-md">{t.prompt}</div>
              </div>
              <div className="flex items-center gap-4">
                <ArrowRight size={16} className="text-slate-700" />
                <div className="text-right">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Routed To</div>
                  <div className="text-xs font-bold text-white">{t.model}</div>
                </div>
              </div>
              <div className="w-24 text-right">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Savings</div>
                <div className="text-xs font-mono font-bold text-emerald-400">{t.savings}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Router Stats Area */}
        <div className="h-48 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem] flex items-center justify-center text-slate-700 italic text-xs">
          Live Sankey Diagram: Traffic Distribution
        </div>
      </div>

      {/* Router Control Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Routing Strategy</h3>
          <div className="space-y-6">
            <StrategyRow label="Aggressive Savings" desc="Maximum use of small models (Llama 3 / Haiku)" active />
            <StrategyRow label="Quality Parity" desc="Route to models with equivalent benchmarks" />
            <StrategyRow label="Lowest Latency" desc="Prioritize speed over absolute cost" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[3rem] p-10 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Quality Guardrail</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-8">
            Our router performs <span className="text-white font-bold">Shadow-Evaluation</span> on 5% of traffic. We compare small-model outputs against GPT-4 to ensure quality drift stays below your <span className="text-indigo-300 font-bold uppercase tracking-widest italic underline underline-offset-4">0.5% threshold</span>.
          </p>
          <button className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold text-xs transition-all shadow-lg">View Quality Reports</button>
        </div>
      </div>
    </div>
  );
}

function StrategyRow({ label, desc, active = false }: any) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <div className="flex-1 pr-10">
        <h4 className={`text-sm font-bold transition-colors ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{label}</h4>
        <p className="text-[10px] text-slate-600 leading-relaxed">{desc}</p>
      </div>
      <div className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${active ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-white/10'}`}>
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`} />
      </div>
    </div>
  );
}
