import React from 'react';
import { 
  ShieldAlert, 
  Zap, 
  RefreshCw, 
  Trash2, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  Cpu, 
  Database,
  Shuffle,
  MousePointer2,
  HardDrive,
  Loader2
} from 'lucide-react';
import { useListRemediationActions, useExecuteRemediation } from '@workspace/api-client-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/currency';

export default function RemediationCenter() {
  const { data: serverActions, isLoading } = useListRemediationActions();
  const { mutate: executeAction, isPending } = useExecuteRemediation();

  // Merge static UI data with live backend data if available, or fallback to static for demo
  const fallbackActions = [
    { id: 1, title: 'Right-size Inference Endpoint', desc: 'Downscale GPT-4 cluster to Llama 3 for non-premium users.', savings: `+${formatCurrency(4200)}/mo`, risk: 'Low', category: 'Efficiency', icon: <Shuffle size={24} /> },
    { id: 2, title: 'Kill Idle H100 Cluster', desc: 'No activity detected in Research Sandbox for 14 hours.', savings: `+${formatCurrency(18.75)}/hr`, risk: 'None', category: 'Waste', icon: <HardDrive size={24} /> },
    { id: 3, title: 'Rotate Leaked API Key', desc: 'Potential key exposure detected in public GitHub repo.', savings: 'Risk Mitigation', risk: 'Critical', category: 'Security', icon: <ShieldAlert size={24} /> },
    { id: 4, title: 'Enable Spot Instances', desc: 'Move background training to spot instances for 80% discount.', savings: `+${formatCurrency(12000)}/yr`, risk: 'Medium', category: 'Efficiency', icon: <Zap size={24} /> },
  ];

  const actions = serverActions?.length ? serverActions.map((a: any, i: number) => ({
    ...a,
    icon: i % 2 === 0 ? <Shuffle size={24} /> : <HardDrive size={24} />,
    risk: a.impact || 'Medium',
    savings: a.savingsPotential.includes('$') ? formatCurrency(parseFloat(a.savingsPotential.replace(/[^0-9.]/g, ''))) : a.savingsPotential,
    category: 'Optimization',
    desc: a.description
  })) : fallbackActions;

  const handleExecute = (actionId: number) => {
    executeAction({
      data: { actionId }
    }, {
      onSuccess: () => {
        toast.success("Action Authorized", {
          description: "Our agent is now executing the remediation protocol."
        });
      },
      onError: () => {
        toast.error("Execution Failed", {
          description: "Could not establish connection to the provider cluster."
        });
      }
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MousePointer2 size={18} />
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Closed-Loop Control Center</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Autonomous Remediation Center</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            One-click execution of cost-saving and security strategies. Our agent identifies the opportunity, you authorize the action.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
            <Zap size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{formatCurrency(18500)} Identified Savings</span>
          </div>
        </div>
      </header>

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {isLoading ? (
          <div className="col-span-full h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" size={48} />
          </div>
        ) : actions.map((a: any) => (
          <div key={a.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-10 backdrop-blur-md hover:bg-white/[0.03] transition-all group relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  a.risk === 'Critical' || a.risk === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'
                }`}>
                  {a.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{a.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{a.category}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      a.risk === 'Critical' || a.risk === 'High' ? 'text-red-400' : 'text-indigo-300'
                    }`}>Risk: {a.risk}</span>
                  </div>
                </div>
              </div>
              {a.status === 'Completed' && (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
              )}
            </div>

            <p className="text-sm text-slate-400 leading-relaxed mb-8 pr-12">
              {a.desc}
            </p>

            <div className="flex items-center justify-between pt-8 border-t border-white/[0.05]">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Impact</div>
                <div className="text-sm font-mono font-bold text-emerald-400">{a.savings}</div>
              </div>
              <button 
                onClick={() => handleExecute(a.id)}
                disabled={isPending || a.status === 'Completed'}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-white/10 disabled:text-slate-500 rounded-xl text-white font-bold text-xs transition-all shadow-lg flex items-center gap-2"
              >
                {isPending ? <Loader2 className="animate-spin" size={14} /> : a.status === 'Completed' ? 'Executed' : 'Authorize Action'} 
                {a.status !== 'Completed' && !isPending && <ArrowRight size={14} />}
              </button>
            </div>

            {/* Background Accent */}
            <div className={`absolute bottom-[-10%] right-[-10%] w-32 h-32 rounded-full blur-3xl pointer-events-none ${
              a.risk === 'Critical' || a.risk === 'High' ? 'bg-red-500/5' : 'bg-indigo-500/5'
            }`} />
          </div>
        ))}
      </div>

      {/* Global Remediation Stats */}
      <div className="p-10 bg-white/[0.01] border border-white/[0.05] rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex items-center gap-8">
          <StatBox label="Actions Executed" value="142" />
          <StatBox label="Total Reclaimed" value={formatCurrency(42850)} />
          <StatBox label="Success Rate" value="99.2%" />
        </div>
        <button className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 font-bold text-xs hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
          View Automation Logs <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value }: any) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}
