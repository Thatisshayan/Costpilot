import { useAuth } from "@clerk/react";
import React, { useState } from "react";
import {
  Users, UserPlus, Mail, Shield, Trash2, CheckCircle2, Clock, Loader2, Settings,
  LogOut, Pencil, X, Check, AlertTriangle, Copy, Info, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListWorkspaceMembersQueryKey,
  getListWorkspacesQueryKey,
  useDeleteWorkspaceById,
  useInviteToWorkspace,
  useLeaveWorkspace,
  useListWorkspaceMembers,
  useRemoveMember,
  useUpdateWorkspace,
} from "@workspace/api-client-react";
import type { WorkspaceMember } from "@workspace/api-client-react";
import { useWorkspace } from "@/context/workspace-context";
import { CreateWorkspaceForm } from "@/components/create-workspace-form";
import { apiErrorMessage } from "@/lib/api-error";

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  owner: { label: "Owner", color: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  admin: { label: "Admin", color: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" },
  viewer: { label: "Viewer", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
};

const STATUS_BADGE: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: "Active", color: "text-emerald-300", icon: <CheckCircle2 size={14} aria-hidden /> },
  pending: { label: "Invitation pending", color: "text-amber-300", icon: <Clock size={14} aria-hidden /> },
  expired: { label: "Expired", color: "text-slate-400", icon: <Clock size={14} aria-hidden /> },
};

const card = "bg-white/[0.02] border border-white/[0.06] rounded-3xl backdrop-blur-md";

function RoleBadge({ role }: { role: string }) {
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.viewer;
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badge.color}`}>{badge.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.active;
  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${badge.color}`}>{badge.icon}{badge.label}</span>;
}

type InviteLink = { email: string; url: string };

export default function Collaboration() {
  const { activeWorkspaceId } = useWorkspace();
  if (activeWorkspaceId === null) return <PersonalScopeTeamPage />;
  return <WorkspaceTeamPage workspaceId={activeWorkspaceId} />;
}

function PersonalScopeTeamPage() {
  const { workspaces, setActiveWorkspaceId } = useWorkspace();
  return (
    <div className="pb-20 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Team</h1>
        <p className="text-slate-300 text-sm max-w-xl">
          You are viewing your personal expenses, which only you can see. To share spend with colleagues,
          create a team workspace or switch to one you belong to.
        </p>
      </header>
      <section aria-labelledby="create-heading" className={`${card} p-6 sm:p-8`}>
        <h2 id="create-heading" className="text-lg font-bold text-white mb-1">Create a team workspace</h2>
        <p className="text-sm text-slate-300 mb-5">
          Workspace expenses, vendors and projects are shared with the members you invite. Personal expenses stay private.
        </p>
        <CreateWorkspaceForm idPrefix="team-create-workspace" />
      </section>
      {workspaces.length > 0 && (
        <section aria-labelledby="existing-heading" className={`${card} p-6 sm:p-8`}>
          <h2 id="existing-heading" className="text-lg font-bold text-white mb-4">Your workspaces</h2>
          <ul className="space-y-2">
            {workspaces.map(w => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceId(w.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Building2 size={16} className="text-indigo-300 shrink-0" aria-hidden />
                    <span className="text-sm font-medium text-white truncate">{w.name}</span>
                  </span>
                  <span className="text-xs text-indigo-300 shrink-0">Switch to workspace</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function WorkspaceTeamPage({ workspaceId }: { workspaceId: number }) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { activeWorkspace, activeRole, canManage, setActiveWorkspaceId } = useWorkspace();
  const membersQuery = useListWorkspaceMembers(workspaceId);
  const members = membersQuery.data ?? [];
  const isOwner = activeRole === "owner";

  const inviteMutation = useInviteToWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const removeMemberMutation = useRemoveMember();
  const leaveWorkspaceMutation = useLeaveWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspaceById();

  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "viewer">("viewer");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId) });
    void queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = inviteEmails.split(",").map(v => v.trim()).filter(Boolean);
    const invalid = emails.filter(v => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    if (emails.length === 0) { setInviteError("Enter at least one email address."); return; }
    if (invalid.length) { setInviteError(`Check these addresses: ${invalid.join(", ")}`); return; }
    setInviteError(null);
    const failures: string[] = [];
    const created: InviteLink[] = [];
    for (const email of emails) {
      try {
        const invite = await inviteMutation.mutateAsync({ id: workspaceId, data: { email, role: inviteRole } });
        if (typeof invite.token !== "string") throw new Error("Invitation token missing");
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        created.push({ email, url: new URL(`${base}/accept-invite?token=${encodeURIComponent(invite.token)}`, window.location.origin).toString() });
      } catch (error) {
        failures.push(`${email}: ${apiErrorMessage(error, "invitation failed")}`);
      }
    }
    if (created.length) {
      setInviteLinks(links => [...created, ...links]);
      setInviteEmails("");
      refresh();
      toast.success(`${created.length} invitation link${created.length > 1 ? "s" : ""} created. Copy and share privately.`);
    }
    if (failures.length) setInviteError(failures.join(" · "));
  };

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${what} copied.`); }
    catch { toast.error("Clipboard access failed. Select the link text to copy it manually."); }
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    try {
      await removeMemberMutation.mutateAsync({ memberId: member.id });
      setConfirmRemove(null);
      refresh();
      toast.success(member.status === "pending" ? `Invitation for ${member.email} revoked.` : `${member.email} removed from the workspace.`);
    } catch (error) {
      toast.error(apiErrorMessage(error, "The member could not be removed."));
    }
  };

  const handleLeave = async () => {
    try {
      await leaveWorkspaceMutation.mutateAsync({ id: workspaceId });
      setActiveWorkspaceId(null);
      refresh();
      toast.success("You left the workspace.");
    } catch (error) {
      setConfirmLeave(false);
      toast.error(apiErrorMessage(error, "You could not leave the workspace."));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWorkspaceMutation.mutateAsync({ id: workspaceId });
      setActiveWorkspaceId(null);
      refresh();
      toast.success("Workspace deleted.");
    } catch (error) {
      setConfirmDelete(false);
      toast.error(apiErrorMessage(error, "The workspace could not be deleted."));
    }
  };

  const handleSaveName = async () => {
    const name = nameValue.trim();
    if (!name) { setNameError("Enter a workspace name."); return; }
    try {
      await updateWorkspace.mutateAsync({ id: workspaceId, data: { name } });
      setEditingName(false);
      setNameError(null);
      refresh();
      toast.success("Workspace name updated.");
    } catch (error) {
      setNameError(apiErrorMessage(error, "The name could not be saved."));
    }
  };

  return (
    <div className="pb-20 max-w-5xl mx-auto space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Team</h1>
        <p className="text-slate-300 text-sm max-w-xl">
          Members of <span className="font-semibold text-white">{activeWorkspace?.name ?? "this workspace"}</span> share
          its expenses, vendors and projects. Your role: <span className="font-semibold text-white">{activeRole ? ROLE_BADGE[activeRole].label : "loading…"}</span>.
        </p>
      </header>

      <section aria-labelledby="members-heading">
        <div className="flex items-center gap-3 mb-4">
          <Users size={20} className="text-indigo-300" aria-hidden />
          <h2 id="members-heading" className="text-lg font-bold text-white">Members</h2>
          {membersQuery.isSuccess && (
            <span className="text-xs text-slate-300 font-medium bg-white/5 px-2.5 py-1 rounded-full">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          )}
        </div>
        <div className={`${card} overflow-x-auto`}>
          {membersQuery.isError ? (
            <div role="alert" className="p-6 text-sm text-amber-200 flex flex-wrap items-center gap-3">
              <AlertTriangle size={16} aria-hidden />
              <span>{apiErrorMessage(membersQuery.error, "Members could not be loaded.")}</span>
              <button type="button" onClick={() => void membersQuery.refetch()} className="underline text-indigo-300">Try again</button>
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-left">
              <caption className="sr-only">Workspace members and pending invitations</caption>
              <thead className="border-b border-white/[0.06]">
                <tr className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <th scope="col" className="py-4 px-6">Member</th>
                  <th scope="col" className="py-4 px-4">Role</th>
                  <th scope="col" className="py-4 px-4">Status</th>
                  <th scope="col" className="py-4 px-4">Added</th>
                  <th scope="col" className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {membersQuery.isLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-300" role="status"><Loader2 size={16} className="inline animate-spin mr-2" aria-hidden />Loading members…</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-300">No members to show.</td></tr>
                ) : members.map(member => {
                  const removable = canManage && member.role !== "owner" && member.userId !== userId
                    && !(activeRole === "admin" && member.role === "admin");
                  return (
                    <tr key={member.id}>
                      <td className="py-4 px-6">
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          {member.email}
                          {member.userId === userId && <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">You</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4"><RoleBadge role={member.role} /></td>
                      <td className="py-4 px-4"><StatusBadge status={member.status ?? "active"} /></td>
                      <td className="py-4 px-4 text-xs text-slate-300">{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="py-4 px-6 text-right">
                        {!removable ? <span className="text-xs text-slate-400">—</span> : confirmRemove === member.id ? (
                          <span className="inline-flex items-center gap-2">
                            <button type="button" onClick={() => void handleRemoveMember(member)} disabled={removeMemberMutation.isPending}
                              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold disabled:opacity-50">
                              {member.status === "pending" ? "Revoke" : "Remove"}
                            </button>
                            <button type="button" onClick={() => setConfirmRemove(null)} className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-200 text-xs font-bold">Cancel</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setConfirmRemove(member.id)}
                            aria-label={member.status === "pending" ? `Revoke invitation for ${member.email}` : `Remove ${member.email} from the workspace`}
                            className="p-2 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                            <Trash2 size={16} aria-hidden />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {canManage ? (
        <section aria-labelledby="invite-heading">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus size={20} className="text-emerald-300" aria-hidden />
            <h2 id="invite-heading" className="text-lg font-bold text-white">Invite members</h2>
          </div>
          <div className={`${card} p-6 sm:p-8 space-y-6`}>
            <form onSubmit={handleInvite} noValidate className="space-y-3">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1 min-w-0">
                  <label htmlFor="invite-emails" className="block text-sm font-medium text-slate-300 mb-1.5">Email addresses</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
                    <input id="invite-emails" type="text" inputMode="email" autoComplete="off"
                      placeholder="colleague@company.com, finance@company.com"
                      value={inviteEmails}
                      onChange={e => { setInviteEmails(e.target.value); setInviteError(null); }}
                      aria-invalid={inviteError ? true : undefined}
                      aria-describedby={inviteError ? "invite-hint invite-error" : "invite-hint"}
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.12] rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                </div>
                <div>
                  <label htmlFor="invite-role" className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
                  <select id="invite-role" value={inviteRole} onChange={e => setInviteRole(e.target.value as "admin" | "viewer")}
                    className="w-full md:w-auto px-4 py-3 bg-white/[0.03] border border-white/[0.12] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    <option value="viewer" className="bg-zinc-950">Viewer (read only)</option>
                    <option value="admin" className="bg-zinc-950">Admin</option>
                  </select>
                </div>
                <button type="submit" disabled={inviteMutation.isPending}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0">
                  {inviteMutation.isPending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <UserPlus size={18} aria-hidden />}
                  {inviteMutation.isPending ? "Creating…" : "Create invitation links"}
                </button>
              </div>
              <p id="invite-hint" className="text-xs text-slate-300 flex items-center gap-1.5">
                <Info size={14} aria-hidden /> Separate addresses with commas. CostPilot does not send email: you share each private link yourself. Links expire after 7 days.
              </p>
              {inviteError && <p id="invite-error" role="alert" className="text-sm text-red-300">{inviteError}</p>}
            </form>

            {inviteLinks.length > 0 && (
              <div aria-label="Private invitation links" role="region" className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5 space-y-3">
                <p className="text-sm text-amber-100 flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden />
                  Anyone with a link can join with its role until it is used or expires. Share each link only with its recipient. Links are shown once.
                </p>
                <ul className="space-y-2">
                  {inviteLinks.map(link => (
                    <li key={link.url} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-black/20 rounded-xl p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white">{link.email}</div>
                        <div className="text-xs text-slate-300 break-all select-all font-mono">{link.url}</div>
                      </div>
                      <button type="button" onClick={() => void copy(link.url, `Link for ${link.email}`)}
                        aria-label={`Copy invitation link for ${link.email}`}
                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-100 text-xs font-bold inline-flex items-center gap-1.5 shrink-0">
                        <Copy size={14} aria-hidden /> Copy link
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      ) : (
        <p className="text-sm text-slate-300 flex items-center gap-2"><Info size={14} aria-hidden /> Only owners and admins can invite members.</p>
      )}

      <section aria-labelledby="settings-heading">
        <div className="flex items-center gap-3 mb-4">
          <Settings size={20} className="text-slate-300" aria-hidden />
          <h2 id="settings-heading" className="text-lg font-bold text-white">Workspace settings</h2>
        </div>
        <div className={`${card} p-6 sm:p-8 space-y-6`}>
          <div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2" id="ws-name-label">Workspace name</div>
            {editingName ? (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <input aria-labelledby="ws-name-label" type="text" value={nameValue} maxLength={80} autoFocus
                    onChange={e => { setNameValue(e.target.value); setNameError(null); }}
                    aria-invalid={nameError ? true : undefined} aria-describedby={nameError ? "ws-name-error" : undefined}
                    className="flex-1 min-w-0 px-4 py-2 bg-white/[0.03] border border-white/[0.12] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  <button type="button" onClick={() => void handleSaveName()} disabled={updateWorkspace.isPending} aria-label="Save workspace name"
                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-white"><Check size={16} aria-hidden /></button>
                  <button type="button" onClick={() => { setEditingName(false); setNameError(null); }} aria-label="Cancel editing name"
                    className="p-2 rounded-lg bg-slate-500/10 text-slate-300 hover:bg-slate-500 hover:text-white"><X size={16} aria-hidden /></button>
                </div>
                {nameError && <p id="ws-name-error" role="alert" className="mt-1.5 text-sm text-red-300">{nameError}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">{activeWorkspace?.name ?? "—"}</span>
                {canManage && (
                  <button type="button" onClick={() => { setNameValue(activeWorkspace?.name ?? ""); setEditingName(true); }} aria-label="Rename workspace"
                    className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"><Pencil size={14} aria-hidden /></button>
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-slate-400">Workspace ID: <span className="font-mono">{activeWorkspace?.slug ?? "—"}</span></p>
          </div>

          <div className="pt-4 border-t border-white/[0.06]">
            {confirmLeave ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-amber-100">Leave this workspace? You will lose access to its shared records.</span>
                <button type="button" onClick={() => void handleLeave()} disabled={leaveWorkspaceMutation.isPending}
                  className="px-4 py-2 bg-amber-500 text-black rounded-xl text-sm font-bold disabled:opacity-50">Leave</button>
                <button type="button" onClick={() => setConfirmLeave(false)} className="px-4 py-2 bg-white/5 text-slate-200 rounded-xl text-sm font-bold">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmLeave(true)}
                className="px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 rounded-xl text-sm font-bold flex items-center gap-2">
                <LogOut size={16} aria-hidden /> Leave workspace
              </button>
            )}
            {isOwner && <p className="mt-2 text-xs text-slate-400">The only owner cannot leave; delete the workspace instead.</p>}
          </div>

          {isOwner && (
            <div className="pt-4 border-t border-white/[0.06]">
              {confirmDelete ? (
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
                  <p className="text-sm text-red-200 flex items-start gap-2">
                    <AlertTriangle size={18} className="shrink-0" aria-hidden />
                    Delete this workspace permanently? It must have no expenses, projects or vendors left; shared records are never converted to personal ones.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => void handleDelete()} disabled={deleteWorkspaceMutation.isPending}
                      className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                      {deleteWorkspaceMutation.isPending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}
                      Delete workspace
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl text-sm font-bold">Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl text-sm font-bold flex items-center gap-2">
                  <Trash2 size={16} aria-hidden /> Delete workspace
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <aside className="p-6 bg-indigo-500/5 border border-indigo-500/15 rounded-3xl flex items-start gap-5">
        <Shield size={22} className="text-indigo-300 shrink-0 mt-0.5" aria-hidden />
        <div>
          <h2 className="text-sm font-bold text-white mb-1">What each role can do</h2>
          <ul className="text-sm text-slate-300 leading-relaxed space-y-1">
            <li><span className="font-semibold text-amber-200">Owner</span>: everything an admin can do, plus delete the workspace.</li>
            <li><span className="font-semibold text-indigo-200">Admin</span>: record and edit expenses, manage vendors and projects, invite members and remove viewers.</li>
            <li><span className="font-semibold text-emerald-200">Viewer</span>: read-only access to the workspace's expenses, vendors, projects and exports.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
