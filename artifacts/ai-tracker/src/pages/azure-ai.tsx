import React, { useState } from 'react';
import { 
  Cloud, 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  Key, 
  ArrowRight, 
  CheckCircle2, 
  Server,
  Terminal,
  Info,
  Layout
} from 'lucide-react';
import { useCreatePlatform } from '@workspace/api-client-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getListPlatformsQueryKey } from '@workspace/api-client-react';

export default function AzureAiConnector() {
  const qc = useQueryClient();
  const createPlatformMutation = useCreatePlatform();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('Azure OpenAI');
  const [formNotes, setFormNotes] = useState('Connected via Azure AI Connector guide.');

  const handleConnect = async () => {
    if (!formName.trim()) {
      toast.error('Platform name is required.');
      return;
    }
    try {
      await createPlatformMutation.mutateAsync({
        data: {
          name: formName.trim(),
          category: 'Cloud Infrastructure',
          notes: formNotes.trim() || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
      toast.success('Azure AI connected successfully!');
      setShowForm(false);
    } catch {
      toast.error('Failed to connect Azure AI.');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#0078D4]/20 flex items-center justify-center text-[#0078D4]">
              <Layout size={20} />
            </div>
            <span className="text-[10px] font-black text-[#0078D4] uppercase tracking-[0.2em]">Azure AI Certified</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Azure AI Connector</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Connect your Azure OpenAI Service and Cognitive Services subscriptions. Ingest resource-level spend directly from the Azure Billing API.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Key size={18} />
          Azure App Registration
        </button>
      </header>

      {/* Integration Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <h2 className="text-xl font-bold text-white mb-6">Service Principal Config</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-8">
              Generate a <span className="text-[#0078D4] font-bold">Client Secret</span> in the Azure Portal and provide it below. We require 'Billing Reader' permissions at the Subscription scope.
            </p>
            
            <div className="space-y-4">
              <ConfigField label="Tenant ID" placeholder="00000000-0000-0000-0000-000000000000" />
              <ConfigField label="Client ID" placeholder="00000000-0000-0000-0000-000000000000" />
              <div className="relative group">
                <ConfigField label="Client Secret" placeholder="••••••••••••••••" type="password" />
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <Info size={12} />
                Azure Global & Gov Support
              </div>
              <button className="px-5 py-2 rounded-lg bg-indigo-500 text-white font-bold text-xs shadow-lg hover:bg-indigo-600 transition-all">Verify Connection</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Subscription Coverage</h3>
            <div className="space-y-4">
              <SubRow name="Production-AI-Sub" status="Connected" />
              <SubRow name="Staging-Lab" status="Pending" />
              <SubRow name="MSDN-Developer" status="Excluded" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0078D4]/10 to-[#00BCF2]/10 border border-[#0078D4]/20 rounded-[2.5rem] p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#0078D4]/20 flex items-center justify-center text-[#0078D4] mb-6 shadow-lg">
              <Server size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Cost Management Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              CostPilot correlates Azure Resource Tags with your internal projects automatically using the <span className="text-white font-bold underline decoration-[#0078D4] underline-offset-4 cursor-pointer">Tagging Mapper</span>.
            </p>
            <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/10 transition-all">Configure Tags</button>
          </div>
        </div>
      </div>

      {/* Connect Azure Button */}
      <div className="mb-8">
        {showForm ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md space-y-4">
            <h3 className="text-lg font-bold text-white">Connect Azure OpenAI</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platform Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0078D4]/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0078D4]/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConnect}
                disabled={createPlatformMutation.isPending}
                className="px-6 py-3 bg-[#0078D4] hover:bg-[#0078D4]/90 rounded-xl text-white font-bold text-sm transition-all shadow-lg disabled:opacity-50"
              >
                {createPlatformMutation.isPending ? 'Connecting...' : 'Confirm Connection'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-3 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 bg-[#0078D4]/10 border border-[#0078D4]/20 rounded-[2.5rem] text-[#0078D4] font-bold text-sm hover:bg-[#0078D4]/20 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Layout size={20} />
            Connect Azure OpenAI
          </button>
        )}
      </div>
    </div>
  );
}

function SubRow({ name, status }: any) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{name}</span>
      <span className={`text-[8px] font-black uppercase tracking-widest ${
        status === 'Connected' ? 'text-emerald-400' : 
        status === 'Pending' ? 'text-amber-400' : 
        'text-slate-600'
      }`}>{status}</span>
    </div>
  );
}

function ConfigField({ label, placeholder, type = "text" }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0078D4]/50"
      />
    </div>
  );
}
