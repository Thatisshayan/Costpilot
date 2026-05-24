import React from 'react';
import { 
  ShieldAlert, 
  Lock, 
  EyeOff, 
  Trash2, 
  Database, 
  Download, 
  CheckCircle2, 
  ArrowRight,
  UserX,
  Globe
} from 'lucide-react';

export default function PrivacyHub() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">GDPR Privacy & Data Control</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Manage your organization's data privacy footprint. Configure PII redaction rules and handle Right-to-Erasure requests across all AI providers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white font-bold text-sm hover:bg-white/[0.05] transition-all flex items-center gap-2">
            <Lock size={18} />
            Data Protection Officer
          </button>
        </div>
      </header>

      {/* Privacy Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <EyeOff size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">PII Redaction Engine</h2>
          </div>
          <div className="text-3xl font-black text-white mb-2">1.2M <span className="text-lg font-medium text-slate-500">Entities Masked</span></div>
          <p className="text-xs text-slate-500 leading-relaxed mb-8">
            Automatically identifying and redacting names, emails, and credit cards from API logs before storage.
          </p>
          <button className="w-full py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 font-bold text-xs hover:bg-indigo-500 hover:text-white transition-all">Configure Redaction Rules</button>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Trash2 size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">Data Retention Policy</h2>
          </div>
          <div className="text-3xl font-black text-white mb-2">90 Days <span className="text-lg font-medium text-slate-500">Active Window</span></div>
          <p className="text-xs text-slate-500 leading-relaxed mb-8">
            Telemetry data older than 90 days is automatically purged from CostPilot's primary production databases.
          </p>
          <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/10 transition-all">Adjust Retention Period</button>
        </div>
      </div>

      {/* Compliance Actions */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Subject Access Requests (SAR)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard icon={<Download size={20} />} label="Data Portability" desc="Export all user data in JSON format." />
          <ActionCard icon={<UserX size={20} />} label="Right to Erasure" desc="Permanent deletion of all PII traces." />
          <ActionCard icon={<Globe size={20} />} label="Sub-processor List" desc="View third-party data handlers." />
        </div>
      </div>

      {/* Privacy Alert */}
      <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white mb-1">DPA Integration</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            CostPilot is fully compliant with the <span className="text-emerald-300 font-bold">EU-US Data Privacy Framework</span>. All data processed by our AI insights engine is anonymized using differential privacy techniques.
          </p>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, label, desc }: any) {
  return (
    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:bg-white/[0.08] transition-all cursor-pointer group">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors mb-4">
        {icon}
      </div>
      <h4 className="text-sm font-bold text-white mb-2">{label}</h4>
      <p className="text-[10px] text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
