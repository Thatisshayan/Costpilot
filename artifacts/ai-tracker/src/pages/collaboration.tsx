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
  Loader2,
  Settings,
  ExternalLink,
  LogOut,
  Globe,
  Pencil,
  X,
  Check,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useListWorkspaceMembers, useInviteToWorkspace } from '@workspace/api-client-react';
import {
  useRemoveMember,
  useLeaveWorkspace,
  useDeleteWorkspaceById,
} from '@workspace/api-client-react';
import type { WorkspaceMember } from '@workspace/api-client-react';
import { useWorkspace } from '../context/workspace-context';
import { useUpdateWorkspace, useListWorkspaces } from '@workspace/api-client-react';

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  admin: { label: 'Admin', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  viewer: { label: 'Viewer', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

function getInitials(email: string): string {
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

function AvatarCircle({ email, size = 'md' }: { email: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  const colors = [
    'from-indigo-600 to-indigo-800',
    'from-emerald-600 to-teal-800',
    'from-violet-600 to-purple-800',
    'from-rose-600 to-pink-800',
    'from-amber-600 to-orange-800',
    'from-cyan-600 to-blue-800',
  ];
  const colorIndex = email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-tr ${colors[colorIndex]} flex items-center justify-center font-bold text-white border border-white/10 shadow-lg shrink-0`}
    >
      {getInitials(email)}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const badge = ROLE_BADGE[role] || { label: role, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${badge.color}`}>
      {badge.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400">
        <CheckCircle2 size={10} className="inline mr-1 -mt-0.5" />
        Active
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400">
      <Clock size={10} className="inline mr-1 -mt-0.5" />
      Pending
    </span>
  );
}

function LoadingSkeletonRow() {
  return (
    <tr className="animate-pulse">
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
  );
}

export default function Collaboration() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const { data: workspaces } = useListWorkspaces();

  const { data: liveMembers, isLoading } = useListWorkspaceMembers(activeWorkspaceId ?? 0);
  const inviteMutation = useInviteToWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const removeMemberMutation = useRemoveMember();
  const leaveWorkspaceMutation = useLeaveWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspaceById();

  const members = liveMembers ?? [];
  const currentUserRole = members.find(
    (m: WorkspaceMember) => m.userId === 'u1' || m.role === 'owner'
  )?.role || 'viewer';
  const isOwner = currentUserRole === 'owner';
  const isAdminOrOwner = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Invite form state
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer');

  // Workspace settings state
  const [editingName, setEditingName] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [nameValue, setNameValue] = useState(activeWorkspace?.name || '');
  const [slugValue, setSlugValue] = useState(activeWorkspace?.slug || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);

  React.useEffect(() => {
    if (activeWorkspace) {
      setNameValue(activeWorkspace.name);
      setSlugValue(activeWorkspace.slug);
    }
  }, [activeWorkspace]);

  const invalidateMembers = () => {
    if (activeWorkspaceId) {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${activeWorkspaceId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces`] });
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmails.trim() || !activeWorkspaceId) return;

    const emails = inviteEmails.split(',').map((e) => e.trim()).filter(Boolean);
    let successCount = 0;
    let failCount = 0;

    for (const email of emails) {
      try {
        await inviteMutation.mutateAsync({ id: activeWorkspaceId, data: { email, role: inviteRole } });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      setInviteEmails('');
      invalidateMembers();
      toast.success(`Invitation${successCount > 1 ? 's' : ''} sent to ${successCount} user${successCount > 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} invitation${failCount > 1 ? 's' : ''} failed`);
    }
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    try {
      await removeMemberMutation.mutateAsync({ memberId: member.id });
      invalidateMembers();
      toast.success(`${member.email} removed from workspace`);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!activeWorkspaceId) return;
    try {
      await leaveWorkspaceMutation.mutateAsync({ id: activeWorkspaceId });
      toast.success('You left the workspace');
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces`] });
    } catch {
      toast.error('Failed to leave workspace');
    }
  };

  const handleSaveName = async () => {
    if (!activeWorkspaceId || !nameValue.trim()) return;
    try {
      await updateWorkspace.mutateAsync({ id: activeWorkspaceId, data: { name: nameValue.trim() } });
      setEditingName(false);
      invalidateMembers();
      toast.success('Workspace name updated');
    } catch {
      toast.error('Failed to update workspace name');
    }
  };

  const handleSaveSlug = async () => {
    if (!activeWorkspaceId || !slugValue.trim()) return;
    setSlugChecking(true);
    try {
      await updateWorkspace.mutateAsync({ id: activeWorkspaceId, data: { slug: slugValue.trim() } });
      setEditingSlug(false);
      invalidateMembers();
      toast.success('Workspace slug updated');
    } catch (err: any) {
      if (err?.status === 409 || err?.data?.error?.includes('unique') || err?.data?.error?.includes('duplicate')) {
        toast.error('This slug is already taken');
      } else {
        toast.error('Failed to update workspace slug');
      }
    } finally {
      setSlugChecking(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspaceId) return;
    try {
      await deleteWorkspaceMutation.mutateAsync({ id: activeWorkspaceId });
      setShowDeleteConfirm(false);
      toast.success('Workspace deleted');
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces`] });
    } catch {
      toast.error('Failed to delete workspace');
    }
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/accept-invite?token=');
    toast.success('Invite link copied to clipboard');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Team Collaboration</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Invite your team to review AI audits, manage budgets, and optimize shared platform costs.
          </p>
        </div>
      </header>

      {/* ===== Section 1: Team Members ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Users size={20} className="text-indigo-400" />
          <h2 className="text-lg font-bold text-white">Team Members</h2>
          <span className="text-xs text-slate-500 font-medium bg-white/5 px-2.5 py-1 rounded-full">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>

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
                Array.from({ length: 3 }).map((_, i) => <LoadingSkeletonRow key={i} />)
              ) : members.length > 0 ? (
                members.map((member: WorkspaceMember) => (
                  <tr key={member.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <AvatarCircle email={member.email} />
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            {member.email.split('@')[0]}
                            {member.role === 'owner' && (
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="py-5 px-4">
                      <StatusBadge status={(member as any).status || 'active'} />
                    </td>
                    <td className="py-5 px-4 text-xs text-slate-500 font-medium">
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-5 px-8 text-right">
                      {member.role !== 'owner' && isAdminOrOwner ? (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleRemoveMember(member)}
                            disabled={removeMemberMutation.isPending}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                            title="Remove member"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                    No team members yet. Invite someone above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== Section 2: Invite Members ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <UserPlus size={20} className="text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Invite Members</h2>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md">
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="team@company.ai, colleague@company.ai"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'viewer')}
                className="px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="viewer" className="bg-zinc-950">Viewer</option>
                <option value="admin" className="bg-zinc-950">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviteMutation.isPending || !inviteEmails.trim()}
                className="px-6 py-3.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shadow-lg disabled:opacity-50 shrink-0"
              >
                {inviteMutation.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <UserPlus size={18} />
                )}
                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Info size={14} />
              Separate multiple emails with commas. Invites expire after 7 days.
            </p>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.05]">
            <button
              onClick={handleCopyInviteLink}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <Copy size={14} />
              Copy invite link
            </button>
          </div>
        </div>
      </section>

      {/* ===== Section 3: Workspace Settings ===== */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Settings size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-white">Workspace Settings</h2>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md space-y-6">
          {/* Workspace Name */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                Workspace Name
              </label>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={updateWorkspace.isPending}
                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="p-2 rounded-lg bg-slate-500/10 text-slate-400 hover:bg-slate-500 hover:text-white transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">
                    {activeWorkspace?.name || 'Unnamed Workspace'}
                  </span>
                  {isAdminOrOwner && (
                    <button
                      onClick={() => setEditingName(true)}
                      className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Workspace Slug */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                Workspace Slug
              </label>
              {editingSlug ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={slugValue}
                      onChange={(e) => setSlugValue(e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase())}
                      className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleSaveSlug}
                    disabled={updateWorkspace.isPending || slugChecking}
                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                  >
                    {slugChecking ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button
                    onClick={() => { setEditingSlug(false); setSlugValue(activeWorkspace?.slug || ''); }}
                    className="p-2 rounded-lg bg-slate-500/10 text-slate-400 hover:bg-slate-500 hover:text-white transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Globe size={16} className="text-slate-500" />
                  <span className="text-white font-mono text-sm">
                    {activeWorkspace?.slug || '-'}
                  </span>
                  {isAdminOrOwner && (
                    <button
                      onClick={() => setEditingSlug(true)}
                      className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Leave Workspace */}
          <div className="pt-4 border-t border-white/[0.05]">
            <button
              onClick={handleLeaveWorkspace}
              disabled={leaveWorkspaceMutation.isPending}
              className="px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {leaveWorkspaceMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
              Leave Workspace
            </button>
          </div>

          {/* Delete Workspace (owner only) */}
          {isOwner && (
            <div className="pt-4 border-t border-white/[0.05]">
              {showDeleteConfirm ? (
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={20} className="text-red-400 shrink-0" />
                    <p className="text-sm text-red-300">
                      Are you sure? This will permanently delete the workspace and all its data.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDeleteWorkspace}
                      disabled={deleteWorkspaceMutation.isPending}
                      className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {deleteWorkspaceMutation.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Delete Forever
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Workspace
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* RBAC Info */}
      <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl flex items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
          <Shield size={24} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white mb-1">Role-Based Access Control (RBAC)</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Only <span className="text-indigo-300 font-bold uppercase">Admins</span> can manage integrations and budget thresholds.{' '}
            <span className="text-slate-300 font-bold uppercase">Viewers</span> have read-only access to audit results and cost breakdown charts.{' '}
            <span className="text-amber-300 font-bold uppercase">Owners</span> have full control including billing and workspace deletion.
          </p>
        </div>
      </div>
    </div>
  );
}

function Info(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
