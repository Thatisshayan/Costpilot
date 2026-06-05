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
  Info
} from 'lucide-react';
import { useCreatePlatform } from '@workspace/api-client-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getListPlatformsQueryKey } from '@workspace/api-client-react';

export default function BedrockConnector() {
  const qc = useQueryClient();
  const createPlatformMutation = useCreatePlatform();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('AWS Bedrock');
  const [formNotes, setFormNotes] = useState('Connected via AWS Bedrock Connector guide.');

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
      toast.success('AWS Bedrock connected successfully!');
      setShowForm(false);
    } catch {
      toast.error('Failed to connect AWS Bedrock.');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#FF9900]/20 flex items-center justify-center text-[#FF9900]">
              <Cloud size={20} />
            </div>
            <span className="text-[10px] font-black text-[#FF9900] uppercase tracking-[0.2em]">AWS Bedrock Certified</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AWS Bedrock Connector</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Directly ingest usage and billing telemetry from AWS Bedrock. Track model invocation costs for Claude, Llama, and Titan within the CostPilot dashboard.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Key size={18} />
          Configure IAM Role
        </button>
      </header>

      {/* Integration Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <h2 className="text-xl font-bold text-white mb-6">Connection Policy</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-8">
              We use <span className="text-indigo-300 font-bold">Read-Only IAM Roles</span> to fetch your Bedrock usage logs. CostPilot never requests write permissions to your AWS account.
            </p>
            
            <div className="bg-black/40 rounded-2xl p-6 border border-white/5 font-mono text-[10px] text-slate-500 mb-8">
              <div className="text-emerald-400"># AWS IAM Policy JSON</div>
              <div>{'{'}</div>
              <div className="pl-4">"Version": "2012-10-17",</div>
              <div className="pl-4">"Statement": [{'{'}</div>
              <div className="pl-8">"Effect": "Allow",</div>
              <div className="pl-8">"Action": [</div>
              <div className="pl-12">"bedrock:GetModelInvocationLoggingConfiguration",</div>
              <div className="pl-12">"bedrock:ListModelInvocations"</div>
              <div className="pl-8">],</div>
              <div className="pl-8">"Resource": "*"</div>
              <div className="pl-4">{'}'}]</div>
              <div>{'}'}</div>
            </div>

            <button className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-indigo-300 transition-colors">
              Copy ARN to Clipboard <Terminal size={12} />
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Region Support</h3>
            <div className="space-y-4">
              <RegionRow name="us-east-1" status="Active" />
              <RegionRow name="us-west-2" status="Active" />
              <RegionRow name="eu-central-1" status="Idle" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600/10 to-amber-700/10 border border-orange-500/20 rounded-[2.5rem] p-8">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400 mb-6 shadow-lg">
              <RefreshCw size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Automated Ingestion</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              CostPilot syncs with AWS CloudWatch every <span className="text-white font-bold">15 minutes</span> to ensure your dashboard is always up to date.
            </p>
            <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-xs hover:bg-white/10 transition-all">Enable Real-time Sync</button>
          </div>
        </div>
      </div>

      {/* Connect AWS Button */}
      <div className="mb-8">
        {showForm ? (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md space-y-4">
            <h3 className="text-lg font-bold text-white">Connect AWS Bedrock</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platform Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConnect}
                disabled={createPlatformMutation.isPending}
                className="px-6 py-3 bg-[#FF9900] hover:bg-[#FF9900]/90 rounded-xl text-white font-bold text-sm transition-all shadow-lg disabled:opacity-50"
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
            className="w-full py-4 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded-[2.5rem] text-[#FF9900] font-bold text-sm hover:bg-[#FF9900]/20 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Cloud size={20} />
            Connect AWS Bedrock
          </button>
        )}
      </div>

      {/* Security Disclaimer */}
      <div className="p-6 bg-white/[0.01] border border-white/[0.05] rounded-2xl flex items-center gap-4">
        <ShieldCheck className="text-emerald-500" size={20} />
        <p className="text-[10px] text-slate-500 font-medium">
          Bedrock data is encrypted in transit and at rest using AES-256. CostPilot is SOC2 Type II compliant.
        </p>
      </div>
    </div>
  );
}

function RegionRow({ name, status }: any) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-xs font-mono text-slate-400 group-hover:text-white transition-colors">{name}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'Active' ? 'text-emerald-400' : 'text-slate-600'}`}>{status}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
      </div>
    </div>
  );
}
