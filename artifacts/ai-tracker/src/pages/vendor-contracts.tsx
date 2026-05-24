import React from 'react';
import { 
  Handshake, 
  FileText, 
  Calendar, 
  TrendingDown, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Plus,
  Settings,
  ShieldCheck,
  Building
} from 'lucide-react';

export default function VendorContracts() {
  const contracts = [
    { id: 1, vendor: 'OpenAI Enterprise', value: '$25,000/yr', period: 'Jan 2026 - Jan 2027', status: 'Active', commitment: 'Used 42%' },
    { id: 2, vendor: 'Anthropic Pro (SLA)', value: '$5,000/yr', period: 'March 2026 - March 2027', status: 'Renewing', commitment: 'Used 12%' },
    { id: 3, vendor: 'Google Cloud (Commit)', value: '$100,000/yr', period: 'Jan 2025 - Jan 2027', status: 'Healthy', commitment: 'Used 88%' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Vendor Contracts & Commitments</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Manage your annual commitments and enterprise AI contracts. Track usage against minimum spend requirements and stay ahead of renewals.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Plus size={18} />
          Add Contract
        </button>
      </header>

      {/* Contract Feed */}
      <div className="space-y-6">
        {contracts.map((c) => (
          <div key={c.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400">
                  <Handshake size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white">{c.vendor}</h2>
                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                      c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      c.status === 'Renewing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-medium">
                      <Calendar size={12} />
                      {c.period}
                    </div>
                    <div className="flex items-center gap-1 font-black text-indigo-300 uppercase tracking-widest text-[9px]">
                      <Zap size={10} />
                      {c.commitment}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Contract Value</div>
                  <div className="text-xl font-black text-white">{c.value}</div>
                </div>
                <button className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all">
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/[0.05]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ContractDetail label="SLA Uptime" value="99.9%" />
                <ContractDetail label="Credit Multiplier" value="1.2x" />
                <ContractDetail label="Notice Period" value="30 Days" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Renewal Alert */}
      <div className="mt-8 p-8 bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[3rem] flex flex-col md:flex-row items-center gap-10">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg border border-indigo-500/30">
          <AlertCircle size={32} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">Renewal Intelligence</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Your <span className="text-white font-bold">Anthropic Pro</span> contract renews in <span className="text-amber-400 font-bold">14 days</span>. Based on current usage, we recommend upgrading to the <span className="text-indigo-300 font-bold uppercase tracking-widest italic underline underline-offset-4">Enterprise Tier</span> to unlock volume discounts.
          </p>
          <div className="flex items-center gap-4">
            <button className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-2xl text-white font-bold text-xs transition-all shadow-lg flex items-center gap-2">
              Start Negotiation Deck <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractDetail({ label, value }: any) {
  return (
    <div>
      <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}
