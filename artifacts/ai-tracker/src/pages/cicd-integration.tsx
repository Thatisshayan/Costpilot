import React from 'react';
import { 
  Terminal, 
  Github, 
  GitBranch, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ShieldAlert, 
  Zap, 
  Activity, 
  Settings,
  Plus,
  Webhook
} from 'lucide-react';

import { useListCicdRuns } from '@workspace/api-client-react';
import { formatCurrency } from '../lib/currency';

export default function CicdIntegration() {
  const { data: serverRuns, isLoading } = useListCicdRuns();

  const fallbackPipelines = [
    { id: 1, name: 'Production-Deploy', repo: 'costpilot-core', status: 'Blocked', reason: `Budget Overrun (+${formatCurrency(420)})`, type: 'GitHub Actions' },
    { id: 2, name: 'Staging-Inference-Test', repo: 'llm-router-proxy', status: 'Healthy', reason: `Within ${formatCurrency(50)} Limit`, type: 'GitLab CI' },
    { id: 3, name: 'H100-Fine-Tuning', repo: 'training-scripts', status: 'Healthy', reason: 'Pre-approved', type: 'GitHub Actions' },
  ];

  const pipelines = serverRuns?.length ? serverRuns.map((r: any) => ({
    id: r.id,
    name: r.pipelineName,
    repo: 'enterprise-core',
    status: r.status,
    reason: r.reason,
    type: 'GitHub Actions'
  })) : fallbackPipelines;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <GitBranch size={18} />
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">DevOps / FinOps Bridge</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">FinOps CI/CD Integration</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            "Shift-Left" your AI spend management. Automatically block or warn on deployments that exceed project budgets or increase infrastructure footprint.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
            <Plus size={18} />
            Connect Webhook
          </button>
        </div>
      </header>

      {/* Pipeline Status Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Active Pipeline Checks</h2>
          {pipelines.map((p: any) => (
            <div key={p.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    p.status === 'Blocked' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {p.type.includes('GitHub') ? <Github size={28} /> : <Terminal size={28} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">{p.repo}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{p.type}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                    p.status === 'Blocked' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {p.status}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-8 border-t border-white/[0.05]">
                <div className="flex items-center gap-2">
                  {p.status === 'Blocked' ? <AlertTriangle size={14} className="text-red-400" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
                  <span className="text-sm font-bold text-slate-400">{p.reason}</span>
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 font-bold text-[10px] transition-all flex items-center gap-2">
                  View Logs <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Global Policy Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-8">Deployment Policies</h3>
            <div className="space-y-6">
              <PolicyItem label="Block > 110% Budget" active />
              <PolicyItem label="Warn on H100 usage" active />
              <PolicyItem label={`Require PR Approval > ${formatCurrency(50)}`} active />
              <PolicyItem label="Sync Project Tags" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600/20 to-orange-700/20 border border-red-500/20 rounded-[2.5rem] p-8">
            <ShieldAlert size={32} className="text-red-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Circuit Breaker</h3>
            <p className="text-xs text-red-200/60 leading-relaxed mb-6">
              Critical budget threshold breached. The <span className="text-white font-bold uppercase tracking-tighter italic">Global CI/CD Circuit Breaker</span> is currently **ENABLED**. All new AI infrastructure deployments are paused.
            </p>
            <button className="w-full py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold text-xs transition-all shadow-lg">Manual Override</button>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-6">
              <Webhook size={18} className="text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Webhook Telemetry</h3>
            </div>
            <div className="text-2xl font-black text-white mb-2">4,281</div>
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Validations / Month</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyItem({ label, active = false }: any) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <span className={`text-xs font-bold transition-colors ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{label}</span>
      <div className={`w-10 h-5 rounded-full transition-all relative ${active ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-white/10'}`}>
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`} />
      </div>
    </div>
  );
}
