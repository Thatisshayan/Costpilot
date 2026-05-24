import React from 'react';
import { 
  Receipt, 
  ShieldCheck, 
  TrendingUp, 
  ArrowUpRight, 
  Database, 
  FileText, 
  Download, 
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function TaxOptimization() {
  const categories = [
    { name: 'Model Training (H100)', amount: 4500.00, credit: '20% (R&D)', eligibility: 'High' },
    { name: 'Inference (Production)', amount: 12450.50, credit: '15% (R&D)', eligibility: 'Medium' },
    { name: 'Dataset Preparation', amount: 850.00, credit: '20% (R&D)', eligibility: 'High' },
    { name: 'SaaS Tooling', amount: 420.00, credit: '0%', eligibility: 'None' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Tax Credit Optimizer (R&D)</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Automatically categorize your AI spend for R&D tax credit eligibility. Maximize your hardware and API expense deductions with audit-ready documentation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
            <Download size={18} />
            Export Audit Bundle
          </button>
        </div>
      </header>

      {/* High Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <MetricBox title="Total Eligible Spend" value="$17,800.50" sub="Q1 2026 Analysis" icon={<Database size={20} />} color="text-indigo-400" />
        <MetricBox title="Est. Tax Credit" value="$3,124.00" sub="Potential Recovery" icon={<TrendingUp size={20} />} color="text-emerald-400" />
        <MetricBox title="Audit Readiness" value="Level 4" sub="Highly Defensible" icon={<ShieldCheck size={20} />} color="text-indigo-400" />
      </div>

      {/* Main Table */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">Eligibility Mapping</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-black text-indigo-300 uppercase tracking-widest">
            AI Auto-Classification: Enabled
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-white/[0.01] border-b border-white/[0.05]">
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="py-6 px-8">Expense Category</th>
              <th className="py-6 px-4">Total Amount</th>
              <th className="py-6 px-4">Credit %</th>
              <th className="py-6 px-4">Eligibility</th>
              <th className="py-6 px-8 text-right">Justification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {categories.map((c) => (
              <tr key={c.name} className="group hover:bg-white/[0.01] transition-colors">
                <td className="py-5 px-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                      <Receipt size={18} />
                    </div>
                    <span className="text-sm font-bold text-white">{c.name}</span>
                  </div>
                </td>
                <td className="py-5 px-4">
                  <span className="text-sm font-mono font-bold text-white">${c.amount.toLocaleString()}</span>
                </td>
                <td className="py-5 px-4 text-xs font-bold text-indigo-300">{c.credit}</td>
                <td className="py-5 px-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                    c.eligibility === 'High' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    c.eligibility === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-white/5 text-slate-500 border-white/5'
                  }`}>
                    {c.eligibility}
                  </span>
                </td>
                <td className="py-5 px-8 text-right">
                  <button className="p-2 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                    <Info size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compliance Tip */}
      <div className="mt-8 p-8 bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg border border-indigo-500/30">
          <CheckCircle2 size={32} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">IRS Section 174 Compliance</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Our categorizer follows the latest 2024 guidance for AI software development. We generate the <span className="text-white font-bold italic underline decoration-indigo-500 underline-offset-4">Technical Justification Documents</span> required for successful R&D tax credit claims.
          </p>
          <div className="flex items-center gap-4">
            <button className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/10 transition-all">View Guidance</button>
            <button className="px-6 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 font-bold text-xs hover:bg-indigo-500 hover:text-white transition-all">Download Worksheets</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ title, value, sub, icon, color }: any) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md relative group overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors shadow-inner">
          {icon}
        </div>
        <ArrowUpRight size={16} className="text-slate-700 group-hover:text-white transition-colors" />
      </div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</div>
      <div className={`text-3xl font-black ${color} tracking-tight mb-1`}>{value}</div>
      <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{sub}</div>
      {/* Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/5 transition-all" />
    </div>
  );
}
