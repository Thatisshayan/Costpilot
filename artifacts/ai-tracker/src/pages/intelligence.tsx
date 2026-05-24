import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Send, 
  Sparkles, 
  TrendingUp, 
  Zap, 
  Activity, 
  ShieldCheck, 
  ArrowRight, 
  MessageSquare,
  Cpu,
  Database,
  Search,
  Bot
} from 'lucide-react';
import { usePostIntelligenceQuery } from '@workspace/api-client-react';

export default function CostPilotIntelligence() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm CostPilot Intelligence. I have analyzed your spend across 14 providers. How can I help you optimize your AI infrastructure today?" }
  ]);
  const [input, setInput] = useState('');

  const { mutate: sendQuery, isPending } = usePostIntelligenceQuery();

  const suggestions = [
    "Why did my GPT-4 spend spike on Tuesday?",
    "Show me GPU utilization for the Research cluster.",
    "Which model has the best cost-to-performance ratio?",
    "Forecast my spend for next month."
  ];

  const handleSend = () => {
    if (!input || isPending) return;
    const currentInput = input;
    setMessages([...messages, { role: 'user', content: currentInput }]);
    setInput('');
    
    sendQuery({
      data: { query: currentInput }
    }, {
      onSuccess: (data: any) => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.answer || "I've analyzed your telemetry and identified no significant anomalies." 
        }]);
      },
      onError: () => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm having trouble accessing the telemetry cluster right now. Please try again in a moment." 
        }]);
      }
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto flex flex-col h-[85vh]">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles size={18} />
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Autonomous Agentic Layer</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">CostPilot Intelligence</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Ask any question about your AI spend. Our agent will analyze raw telemetry, identify root causes, and suggest one-click remediations.
          </p>
        </div>
      </header>

      {/* Chat Canvas */}
      <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] backdrop-blur-md overflow-hidden flex flex-col relative">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[80%] p-6 rounded-[2rem] ${
                m.role === 'user' 
                  ? 'bg-indigo-500 text-white shadow-lg' 
                  : 'bg-white/5 border border-white/5 text-slate-300'
              }`}>
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-3 text-indigo-300">
                    <Bot size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Assistant</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed">{m.content}</p>
                
                {m.role === 'assistant' && m.content.includes("recommend") && (
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <button className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-300 text-[10px] font-bold hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-2">
                      <Zap size={14} /> Enable Auto-Pilot Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isPending && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                <BrainCircuit size={16} className="animate-spin text-indigo-400" />
                Processing Telemetry...
              </div>
            </div>
          )}
        </div>

        {/* Suggestions Bar */}
        <div className="px-8 py-4 bg-white/[0.01] border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {suggestions.map(s => (
            <button 
              key={s} 
              onClick={() => setInput(s)}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-500 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-8 pt-4 shrink-0">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Ask a question about your AI spend..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all pr-16"
            />
            <button 
              onClick={handleSend}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white transition-all shadow-lg"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}
