import React from 'react';
import { 
  Bell, 
  Calendar, 
  TrendingDown, 
  Zap, 
  Bot, 
  ArrowRight, 
  CheckCircle2, 
  Mail,
  PieChart,
  BarChart3
} from 'lucide-react';

export default function WeeklyDigest() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Weekly Executive Digest</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            A high-fidelity summary of your organization's AI financial health, delivered every Monday morning.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
            <Mail size={16} />
            Send Test Digest
          </button>
        </div>
      </header>

      {/* The Digest Template Mockup */}
      <div className="bg-[#09090b] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl max-w-2xl mx-auto">
        {/* Email Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-8 text-white">
          <div className="flex justify-between items-start mb-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Bot size={24} />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Digest ID: #CP-829</div>
              <div className="text-sm font-bold">May 16 - May 23, 2026</div>
            </div>
          </div>
          <h2 className="text-4xl font-black tracking-tighter mb-2">Efficiency Report</h2>
          <p className="text-indigo-100/70 text-sm">Your weekly summary of AI spend & optimization.</p>
        </div>

        {/* Content */}
        <div className="p-10 space-y-10">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Weekly Spend</div>
              <div className="text-2xl font-black text-white">$2,142.50</div>
              <div className="text-xs font-bold text-red-400 flex items-center gap-1">
                <TrendingDown size={12} className="rotate-180" />
                +12.4%
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Savings Found</div>
              <div className="text-2xl font-black text-emerald-400">$410.00</div>
              <div className="text-xs font-bold text-emerald-500/60 uppercase tracking-tighter">Action Required</div>
            </div>
          </div>

          {/* Intelligence Insight */}
          <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl relative overflow-hidden group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
                <Zap size={20} />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Smart Insight</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed italic">
              "We detected 3 duplicate image generation tools being used across your teams. Consolidating to Midjourney could reduce your creative overhead by <span className="text-white font-bold">$75/mo</span>."
            </p>
          </div>

          {/* Top Vendors */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Top Spend by Provider</div>
            <div className="space-y-4">
              <VendorRow name="OpenAI" amount={1240} percent={60} color="bg-emerald-500" />
              <VendorRow name="Anthropic" amount={650} percent={30} color="bg-indigo-500" />
              <VendorRow name="Runway" amount={252} percent={10} color="bg-violet-500" />
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-10 border-t border-white/5 text-center">
            <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
              Review Detailed Audit <ArrowRight size={16} />
            </button>
            <p className="mt-6 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              You are receiving this because you are an Admin of StartupAI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VendorRow({ name, amount, percent, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs font-bold">
        <span className="text-white">{name}</span>
        <span className="text-slate-400 font-mono">${amount.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
