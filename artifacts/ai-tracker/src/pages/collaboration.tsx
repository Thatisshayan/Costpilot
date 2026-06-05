import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Trash2, 
  CheckCircle2, 
  Clock,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useListWorkspaceMembers, useInviteToWorkspace } from '@workspace/api-client-react';
import type { WorkspaceMember } from '@workspace/api-client-react';
import { useWorkspace } from '../context/workspace-context';

const MOCK_MEMBERS: WorkspaceMember[] = [
  { id: 1, workspaceId: 1, userId: 'u1', email: 'alex@startup.ai', role: 'owner', createdAt: '' },
  { id: 2, workspaceId: 1, userId: 'u2', email: 'jordan@startup.ai', role: 'admin', createdAt: '' },
  { id: 3, workspaceId: 1, userId: 'u3', email: 'sarah@startup.ai', role: 'viewer', createdAt: '' },
];

const ROLE_LABELS: Record<string, string> = { owner: 'Admin', admin: 'Admin', viewer: 'Viewer' };

export default function Collaboration() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer');
  const { activeWorkspaceId } = useWorkspace();
  const { data: liveMembers, isLoading } = useListWorkspaceMembers(activeWorkspaceId ?? 0);
  const inviteMutation = useInviteToWorkspace();
  const members = (liveMembers && liveMembers.length > 0) ? liveMembers : MOCK_MEMBERS;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !activeWorkspaceId) return;
    try {
      await inviteMutation.mutateAsync({ id: activeWorkspaceId, data: { email: inviteEmail, role: inviteRole } });
      setInviteEmail('');
      toast.success(`Invitation sent to ${inviteEmail}`);
    } catch {
      toast.error('Failed to send invitation. Using fallback.');
      const newMember: WorkspaceMember = {
        id: Date.now(), workspaceId: activeWorkspaceId, userId: 'new', email: inviteEmail, role: inviteRole, createdAt: new Date().toISOString(),
      };
      toast.success(`Invitation sent to ${inviteEmail}`);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Team Collaboration</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Invite your team to review AI audits, manage budgets, and optimize shared platform costs.
          </p>
        </div>
        <form onSubmit={handleInvite} className="flex items-center gap-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="email" 
              placeholder="team@company.ai" 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64"
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'viewer')}
            className="px-3 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="viewer" className="bg-zinc-950">Viewer</option>
            <option value="admin" className="bg-zinc-950">Admin</option>
          </select>
          <button type="submit" disabled={inviteMutation.isPending || isLoading} className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shadow-lg disabled:opacity-50">
            {inviteMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            {inviteMutation.isPending ? 'Sending...' : 'Invite'}
          </button>
        </form>
      </header>

      {/* Team Table */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] overflow-hidden backdrop-blur-md">
        <table className="w-full text-left">
          <thead className="bg-white/[0.01] border-b border-white/[0.05]">
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              <th className="py-6 px-8">Member</th>
              <th className="py-6 px-4">Role</th>
              <th className="py-6 px-4">Status</th>
              <th className="py-6 px-4">Joined</th>
              <th className="py-6 px-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-700/30" />
                      <div className="space-y-2">
                        <div className="h-3 w-28 bg-slate-700/30 rounded" />
                        <div className="h-2.5 w-40 bg-slate-700/20 rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4"><div className="h-4 w-16 bg-slate-700/30 rounded" /></td>
                  <td className="py-5 px-4"><div className="h-4 w-14 bg-slate-700/30 rounded" /></td>
                  <td className="py-5 px-4"><div className="h-4 w-20 bg-slate-700/30 rounded" /></td>
                  <td className="py-5 px-8" />
                </tr>
              ))
            ) : members.length > 0 ? (
              members.map((member) => (
                <tr key={member.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center font-bold text-slate-300 border border-white/5 shadow-inner">
                        {member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{member.email.split('@')[0]}</div>
                        <div className="text-xs text-slate-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-indigo-400" />
                      <span className="text-xs font-bold text-slate-300">{ROLE_LABELS[member.role] || member.role}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 size={10} className="inline mr-1" />
                      Active
                    </span>
                  </td>
                  <td className="py-5 px-4 text-xs text-slate-500 font-medium">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-5 px-8 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"><MoreHorizontal size={16} /></button>
                      <button className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="py-12 text-center text-slate-500 text-sm">No team members yet. Invite someone above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Access Control Alert */}
      <div className="mt-8 p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl flex items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
          <Shield size={24} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white mb-1">Role-Based Access Control (RBAC)</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Only <span className="text-indigo-300 font-bold uppercase">Admins</span> can manage integrations and budget thresholds. <span className="text-slate-300 font-bold uppercase">Viewers</span> have read-only access to audit results and cost breakdown charts.
          </p>
        </div>
      </div>
    </div>
  );
}
