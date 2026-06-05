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
  Hexagon
} from 'lucide-react';
import { useCreatePlatform } from '@workspace/api-client-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getListPlatformsQueryKey } from '@workspace/api-client-react';

export default function VertexAiConnector() {
  const qc = useQueryClient();
  const createPlatformMutation = useCreatePlatform();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('GCP Vertex AI');
  const [formNotes, setFormNotes] = useState('Connected via GCP Vertex AI Connector guide.');

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
      toast.success('GCP Vertex AI connected successfully!');
      setShowForm(false);
    } catch {
      toast.error('Failed to connect GCP Vertex AI.');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#4285F4]/20 flex items-center justify-center text-[#4285F4]">
              <Hexagon size={20} />
            </div>
            <span className="text-[10px] font-black text-[#4285F4] uppercase tracking-[0.2em]">GCP Vertex AI Certified</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">GCP Vertex AI Connector</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Track spend across Vertex AI models, including Gemini, PaLM, and custom-trained endpoints on Google Cloud Platform.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Key size={18} />
          Upload Service Account JSON
        </button>
      </header>

      {/* Integration Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
        {/* Service Account Dropzone */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-12 backdrop-blur-md flex flex-col items-center justify-center text-center border-dashed group hover:border-[#4285F4]/30 transition-all cursor-pointer">
            <div className="w-16 h-16 rounded-3xl bg-[#4285F4]/10 flex items-center justify-center text-[#4285F4] mb-6 shadow-inner group-hover:scale-110 transition-transform">
              <Database size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Drop Service Account JSON</h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-8">
              We require the 'Vertex AI Viewer' and 'Billing Viewer' roles at the Project or Organization level.
            </p>
            <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-white/10 transition-colors">
              Browse Local Files
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Active GCP Projects</h3>
            <div className="space-y-4">
              <ProjectRow name="ai-analytics-prod" status="Syncing" />
              <ProjectRow name="ml-research-lab" status="Syncing" />
              <ProjectRow name="sandbox-dev-42" status="Needs Auth" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#4285F4]/10 to-[#34A853]/10 border border-[#4285F4]/20 rounded-[2.5rem] p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#4285F4]/20 flex items-center justify-center text-[#4285F4] mb-6 shadow-lg">
              <RefreshCw size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">BigQuery Billing Export</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Connect to your <span className="text-white font-bold">Billing BigQuery Dataset</span> for sub-cent accuracy on multi-region inference tasks.
            </p>
            <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/10 transition-all">Connect BigQuery</button>
          </div>
        </div>
      </div>

      {/* Connect GCP Button */}
      <div className="mb-8">
        {showForm ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md space-y-4">
            <h3 className="text-lg font-bold text-white">Connect GCP Vertex AI</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platform Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#4285F4]/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#4285F4]/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConnect}
                disabled={createPlatformMutation.isPending}
                className="px-6 py-3 bg-[#4285F4] hover:bg-[#4285F4]/90 rounded-xl text-white font-bold text-sm transition-all shadow-lg disabled:opacity-50"
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
            className="w-full py-4 bg-[#4285F4]/10 border border-[#4285F4]/20 rounded-[2.5rem] text-[#4285F4] font-bold text-sm hover:bg-[#4285F4]/20 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Hexagon size={20} />
            Connect GCP Vertex AI
          </button>
        )}
      </div>
    </div>
  );
}

function ProjectRow({ name, status }: any) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-xs font-mono text-slate-400 group-hover:text-white transition-colors">{name}</span>
      <span className={`text-[8px] font-black uppercase tracking-widest ${
        status === 'Syncing' ? 'text-emerald-400' : 'text-red-400'
      }`}>{status}</span>
    </div>
  );
}
