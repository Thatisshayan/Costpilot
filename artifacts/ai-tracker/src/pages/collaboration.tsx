import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Trash2, 
  CheckCircle2, 
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Viewer' | 'Billing';
  status: 'Active' | 'Pending';
  lastActive: string;
}

export default function Collaboration() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([
    { id: 1, name: 'Alex Rivera', email: 'alex@startup.ai', role: 'Admin', status: 'Active', lastActive: 'Now' },
    { id: 2, name: 'Jordan Chen', email: 'jordan@startup.ai', role: 'Viewer', status: 'Active', lastActive: '2h ago' },
    { id: 3, name: 'Sarah Miller', email: 'sarah@startup.ai', role: 'Billing', status: 'Pending', lastActive: '—' },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    const newMember: TeamMember = {
      id: members.length + 1,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: 'Viewer',
      status: 'Pending',
      lastActive: '—'
    };
    
    setMembers([...members, newMember]);
    setInviteEmail('');
    toast.success(`Invitation sent to ${inviteEmail}`);
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
          <button type="submit" className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shadow-lg">
            <UserPlus size={18} />
            Invite
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
              <th className="py-6 px-4">Last Active</th>
              <th className="py-6 px-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {members.map((member) => (
              <tr key={member.id} className="group hover:bg-white/[0.01] transition-colors">
                <td className="py-5 px-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center font-bold text-slate-300 border border-white/5 shadow-inner">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-5 px-4">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-indigo-400" />
                    <span className="text-xs font-bold text-slate-300">{member.role}</span>
                  </div>
                </td>
                <td className="py-5 px-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    member.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {member.status === 'Active' ? <CheckCircle2 size={10} className="inline mr-1" /> : <Clock size={10} className="inline mr-1" />}
                    {member.status}
                  </span>
                </td>
                <td className="py-5 px-4 text-xs text-slate-500 font-medium">
                  {member.lastActive}
                </td>
                <td className="py-5 px-8 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"><MoreHorizontal size={16} /></button>
                    <button className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
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
