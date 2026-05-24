import React, { useState } from 'react';
import { 
  Shield, 
  Key, 
  Lock, 
  Globe, 
  Building2, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

export default function SSOConfiguration() {
  const [method, setMethod] = useState<'saml' | 'oidc' | 'clerk'>('saml');
  
  const handleSave = () => {
    toast.success('SSO Configuration updated for your organization');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Enterprise Identity (SSO)</h1>
        <p className="text-slate-400 text-sm">
          Secure your team's access to CostPilot with SAML 2.0 or OIDC. Manage authentication policies for all members.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Method Selector */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Authentication Method</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MethodCard 
              active={method === 'saml'} 
              onClick={() => setMethod('saml')}
              title="SAML 2.0"
              sub="Okta, Azure AD, Ping"
              icon={<Shield size={20} />}
            />
            <MethodCard 
              active={method === 'oidc'} 
              onClick={() => setMethod('oidc')}
              title="OIDC"
              sub="Google, Auth0"
              icon={<Key size={20} />}
            />
            <MethodCard 
              active={method === 'clerk'} 
              onClick={() => setMethod('clerk')}
              title="Clerk Managed"
              sub="Passwordless, Social"
              icon={<Users size={20} />}
            />
          </div>
        </div>

        {/* Configuration Fields */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Connection Settings</h2>
          
          <div className="space-y-6">
            <ConfigField label="Provider SSO URL" placeholder="https://okta.com/app/exk..." />
            <ConfigField label="Issuer / Entity ID" placeholder="https://www.okta.com/..." />
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Public Certificate</label>
              <textarea 
                rows={4}
                placeholder="-----BEGIN CERTIFICATE----- ..."
                className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-xs font-mono text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            
            <div className="pt-6 border-t border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-slate-500" />
                <span className="text-xs text-slate-500 font-medium italic">Changes will require all members to re-authenticate.</span>
              </div>
              <button 
                onClick={handleSave}
                className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all active:scale-95 shadow-lg"
              >
                Apply Configuration
              </button>
            </div>
          </div>
        </div>

        {/* Security Policy */}
        <div className="bg-gradient-to-br from-indigo-600/10 to-violet-700/10 border border-indigo-500/20 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg border border-indigo-500/30">
            <Globe size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">Domain Enforcement</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Automatically provision users from <span className="text-indigo-300 font-bold uppercase">@company.ai</span> and enforce SSO login only. Prevent password-based bypass for your organization.
            </p>
            <div className="flex items-center gap-4">
              <button className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/10 transition-all">Enable Domain Lockdown</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodCard({ active, onClick, title, sub, icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-2xl border transition-all text-left group ${
        active 
          ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg' 
          : 'bg-white/[0.02] border-white/5 hover:border-white/20'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${active ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-500'}`}>
        {icon}
      </div>
      <div className="text-sm font-bold text-white mb-1">{title}</div>
      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{sub}</div>
    </button>
  );
}

function ConfigField({ label, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      <input 
        type="text" 
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />
    </div>
  );
}
