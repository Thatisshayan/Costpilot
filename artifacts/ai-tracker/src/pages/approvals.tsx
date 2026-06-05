import React, { useState } from 'react';
import { 
  FileCheck, 
  Clock, 
  ArrowUpRight, 
  User, 
  DollarSign, 
  ShieldCheck, 
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useListWorkspaceMembers } from '@workspace/api-client-react';
import { useWorkspace } from '../context/workspace-context';

type ApprovalRequest = {
  id: number;
  requester: string;
  requesterEmail?: string;
  tool: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  time: string;
};

const MOCK_REQUESTS: ApprovalRequest[] = [
  { id: 1, requester: 'Jordan Chen', requesterEmail: 'jordan@startup.ai', tool: 'OpenAI API', amount: 500, reason: 'Scaling staging environment for RAG benchmarks.', status: 'pending', time: '2h ago' },
  { id: 2, requester: 'Sarah Miller', requesterEmail: 'sarah@startup.ai', tool: 'Claude Pro (2 Seats)', amount: 40, reason: 'New hires joining the creative team.', status: 'approved', time: '5h ago' },
  { id: 3, requester: 'Alex Rivera', requesterEmail: 'alex@startup.ai', tool: 'Runway Gen-3', amount: 95, reason: 'Video generation for marketing campaign.', status: 'pending', time: 'Yesterday' },
];

export default function ApprovalWorkflows() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(MOCK_REQUESTS);
  const { activeWorkspaceId } = useWorkspace();
  const { data: approvers } = useListWorkspaceMembers(activeWorkspaceId ?? 0);

  const approverNames = (approvers && approvers.length > 0)
    ? approvers.map(a => a.email.split('@')[0])
    : ['Alex Rivera', 'Jordan Chen', 'Sarah Miller'];

  const handleAction = (id: number, status: 'approved' | 'rejected') => {
    setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
    const request = requests.find(r => r.id === id);
    const label = status === 'approved' ? 'approved' : 'rejected';
    toast.success(
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} flex items-center justify-center`}>
          {status === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        </div>
        <div>
          <div className="font-bold text-sm">Request {label}</div>
          <div className="text-xs text-slate-400">${request?.amount} for {request?.tool} — {label} by {approverNames[0]}</div>
        </div>
      </div>,
      { duration: 4000 }
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Approval Workflows</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Control organizational spend with custom approval chains. Require sign-off for credit increases or new tool subscriptions.
          </p>
        </div>
        <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
          <Plus size={18} />
          New Policy
        </button>
      </header>

      {/* Approver Bar */}
      <div className="mb-8 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-md flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Approvers:</span>
        {approverNames.map((name, i) => (
          <span key={i} className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/10">
            {name}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Requests</div>
          <div className="text-2xl font-black text-white">{requests.filter(r => r.status === 'pending').length}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Monthly Approved</div>
          <div className="text-2xl font-black text-white">$1,420.00</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Auto-Approval Rate</div>
          <div className="text-2xl font-black text-white">42%</div>
        </div>
      </div>

      {/* Requests Feed */}
      <div className="space-y-6">
        {requests.map((request) => (
          <div key={request.id} className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group overflow-hidden relative">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400">
                  <DollarSign size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white">${request.amount} for {request.tool}</h2>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      request.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                      request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-medium">
                      <User size={12} />
                      {request.requester}
                    </div>
                    <div className="flex items-center gap-1 font-medium">
                      <Clock size={12} />
                      {request.time}
                    </div>
                  </div>
                </div>
              </div>

              {request.status === 'pending' ? (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleAction(request.id, 'rejected')}
                    className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                    title="Reject request"
                  >
                    <XCircle size={20} />
                  </button>
                  <button 
                    onClick={() => handleAction(request.id, 'approved')}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all shadow-lg"
                  >
                    <CheckCircle2 size={18} />
                    Approve
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Decision Recorded
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-white/[0.05]">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rationale</div>
              <p className="text-sm text-slate-300 italic">"{request.reason}"</p>
            </div>

            {/* Background Glow for Pending */}
            {request.status === 'pending' && (
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
            )}
          </div>
        ))}
      </div>

      {/* Policy Tip */}
      <div className="mt-8 p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl flex items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white mb-1">Smart Auto-Approval</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            You can set up <span className="text-indigo-300 font-bold">Smart Rules</span> to automatically approve requests under $50 if the project has <span className="text-white font-bold">Healthy Runway</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
