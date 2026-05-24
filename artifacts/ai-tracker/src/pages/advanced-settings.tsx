import React from 'react';
import { 
  Settings2, 
  ShieldCheck, 
  Lock, 
  Globe, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight,
  UserCheck,
  AlertCircle,
  Key
} from 'lucide-react';

export default function AdvancedSettings() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Advanced Workspace Policy</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Configure global security, data sovereignty, and administrative policies for your entire organization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
            <CheckCircle2 size={18} />
            Save Changes
          </button>
        </div>
      </header>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
        <div className="lg:col-span-8 space-y-8">
          {/* Security Section */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Global Security Controls</h2>
            </div>
            
            <div className="space-y-10">
              <PolicyToggle 
                label="Strict MFA Enforcement" 
                desc="Require all workspace members to use hardware keys or authenticator apps." 
                active 
              />
              <PolicyToggle 
                label="Session Timeout (12h)" 
                desc="Automatically expire user sessions after 12 hours of inactivity." 
                active 
              />
              <PolicyToggle 
                label="API Key Masking" 
                desc="Always mask production API keys in the dashboard, even for Admins." 
              />
            </div>
          </div>

          {/* Data Sovereignty Section */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-inner">
                <Globe size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Data Sovereignty</h2>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Primary Storage Region</label>
                <select className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none">
                  <option>AWS eu-central-1 (Frankfurt)</option>
                  <option>AWS us-east-1 (N. Virginia)</option>
                  <option>GCP europe-west3 (Frankfurt)</option>
                </select>
              </div>
              
              <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-4">
                <AlertCircle className="text-indigo-400" size={20} />
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  Changing your storage region will trigger a <span className="text-white font-bold">Data Migration Job</span> which may take up to 24 hours to complete.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[2.5rem] p-8">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Audit Log Trail</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-8">
              Every policy change is recorded in the immutable <span className="text-indigo-300 font-bold underline cursor-pointer">Workspace Audit Log</span> for compliance.
            </p>
            <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/10 transition-all">View Audit Trail</button>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Workspace Ownership</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center font-bold text-slate-400 text-xs">AR</div>
              <div>
                <div className="text-xs font-bold text-white">Alex Rivera</div>
                <div className="text-[10px] text-slate-500 uppercase font-black">Owner</div>
              </div>
            </div>
            <button className="w-full py-3 bg-red-500/10 border border-red-500/10 rounded-xl text-red-400 font-bold text-xs hover:bg-red-500 hover:text-white transition-all">Transfer Ownership</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyToggle({ label, desc, active = false }: any) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <div className="flex-1 pr-10">
        <h4 className="text-sm font-bold text-white mb-1">{label}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
      <div className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${active ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-white/10'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
      </div>
    </div>
  );
}
