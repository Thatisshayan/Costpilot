import { useEffect, useState } from 'react';
import {
  User,
  Database,
  CheckCircle2,
  Send,
  UserPlus,
  Trash2,
  Bell,
  Loader2,
  Plus,
  Pencil,
} from 'lucide-react';
import {
  useUpdateWorkspace,
  useListWorkspaceMembers,
  useInviteToWorkspace,
  useListPlatforms,
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
  useListWebhooks,
  useCreateWebhook,
  getListWorkspaceMembersQueryKey,
  getListPlatformsQueryKey,
  getListWebhooksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/context/workspace-context";
import { toast } from "sonner";

export default function Settings() {
  const qc = useQueryClient();
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();

  const [currency, setCurrency] = useState("USD ($)");

  // Profile form
  const [profileName, setProfileName] = useState("");
  const [profileSlug, setProfileSlug] = useState("");
  const updateWorkspaceMutation = useUpdateWorkspace();

  useEffect(() => {
    if (activeWorkspace) {
      setProfileName(activeWorkspace.name);
      setProfileSlug(activeWorkspace.slug);
    }
  }, [activeWorkspace]);

  const handleSaveProfile = async () => {
    if (!activeWorkspaceId) return;
    try {
      await updateWorkspaceMutation.mutateAsync({
        id: activeWorkspaceId,
        data: { name: profileName, slug: profileSlug },
      });
      toast.success("Workspace updated successfully.");
    } catch {
      toast.error("Failed to update workspace.");
    }
  };

  // Team members
  const { data: members = [], isLoading: membersLoading } = useListWorkspaceMembers(activeWorkspaceId ?? 0, {
    query: { enabled: !!activeWorkspaceId } as any,
  });
  const inviteMutation = useInviteToWorkspace();
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("viewer");

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !activeWorkspaceId) return;
    try {
      await inviteMutation.mutateAsync({
        id: activeWorkspaceId,
        data: { email: newEmail, role: newRole as "admin" | "viewer" },
      });
      qc.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(activeWorkspaceId) });
      toast.success("Invitation sent.");
      setNewEmail("");
    } catch {
      toast.error("Failed to send invitation.");
    }
  };

  const handleDeleteMember = (_id: number) => {
    toast.error("Member removal not available via API yet.");
  };

  const displayName = (email: string) =>
    email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);

  // Platforms
  const { data: platforms = [], isLoading: platformsLoading } = useListPlatforms();
  const createPlatformMutation = useCreatePlatform();
  const updatePlatformMutation = useUpdatePlatform();
  const deletePlatformMutation = useDeletePlatform();
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [platformName, setPlatformName] = useState("");
  const [platformApiKey, setPlatformApiKey] = useState("");
  const [editingPlatform, setEditingPlatform] = useState<{ id: number; apiKey: string } | null>(null);
  const [revealedPlatforms, setRevealedPlatforms] = useState<Set<number>>(new Set());

  const handleCreatePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName) return;
    try {
      await createPlatformMutation.mutateAsync({ data: { name: platformName, apiKey: platformApiKey || undefined } });
      qc.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
      toast.success("Platform added.");
      setPlatformName("");
      setPlatformApiKey("");
      setShowPlatformForm(false);
    } catch {
      toast.error("Failed to add platform.");
    }
  };

  const handleUpdatePlatformKey = async () => {
    if (!editingPlatform) return;
    try {
      await updatePlatformMutation.mutateAsync({ id: editingPlatform.id, data: { apiKey: editingPlatform.apiKey || undefined } });
      qc.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
      toast.success("API key updated.");
      setEditingPlatform(null);
    } catch {
      toast.error("Failed to update API key.");
    }
  };

  const handleDeletePlatform = async (id: number) => {
    try {
      await deletePlatformMutation.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
      toast.success("Platform removed.");
    } catch {
      toast.error("Failed to remove platform.");
    }
  };

  const toggleRevealPlatform = (id: number) => {
    setRevealedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Webhooks
  const { data: webhooks = [], isLoading: webhooksLoading } = useListWebhooks();
  const createWebhookMutation = useCreateWebhook();
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookType, setWebhookType] = useState<"slack" | "discord">("slack");
  const [webhookEvents, setWebhookEvents] = useState("");

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !webhookName || !webhookUrl) return;
    try {
      await createWebhookMutation.mutateAsync({
        data: {
          workspaceId: activeWorkspaceId,
          name: webhookName,
          url: webhookUrl,
          type: webhookType,
          events: webhookEvents || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: getListWebhooksQueryKey() });
      toast.success("Webhook created.");
      setWebhookName("");
      setWebhookUrl("");
      setWebhookEvents("");
      setShowWebhookForm(false);
    } catch {
      toast.error("Failed to create webhook.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Workspace Settings</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Manage your personal profile, customize workspace parameters, invite core team members, and generate administrative API keys.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={updateWorkspaceMutation.isPending}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/10 disabled:opacity-50"
          >
            {updateWorkspaceMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {updateWorkspaceMutation.isPending ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </header>

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">

          {/* Profile Section */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Administrative Profile</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Personal Account Identity</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace Slug</label>
                <input
                  type="text"
                  value={profileSlug}
                  onChange={(e) => setProfileSlug(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Core Team Membership */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <UserPlus size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Team & Collaboration</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Workspace Seats & Access Control</p>
              </div>
            </div>

            {/* Quick Invite Form */}
            <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-4 mb-8 bg-black/30 p-4 border border-white/5 rounded-2xl">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="developer-email@company.com"
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                required
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              >
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {inviteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {inviteMutation.isPending ? "Sending…" : "Send Invitation"}
              </button>
            </form>

            {/* Members List */}
            {membersLoading ? (
              <div className="text-center py-8 text-slate-500 text-sm">Loading members…</div>
            ) : (
              <div className="space-y-4">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 border border-white/5 rounded-2xl bg-white/[0.01]">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-white">{displayName(m.email)}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{m.email}</div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] uppercase font-black text-slate-400 bg-white/5 px-2.5 py-1 border border-white/10 rounded-md">
                        {m.role}
                      </span>
                      {m.role !== "owner" && (
                        <button
                          onClick={() => handleDeleteMember(m.id)}
                          className="text-red-400 p-2 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform & API Key Management */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Database size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Platform & API Key Management</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Connected AI Service Accounts</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Manage the AI platforms you connect to CostPilot. Store API keys securely to enable automatic usage syncing and telemetry.
            </p>

            {platformsLoading ? (
              <div className="text-center py-8 text-slate-500 text-sm">Loading platforms…</div>
            ) : (
              <div className="space-y-3 mb-6">
                {platforms.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 border border-white/5 rounded-2xl bg-white/[0.01]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        {p.category && (
                          <span className="text-[8px] uppercase font-black text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                            {p.category}
                          </span>
                        )}
                      </div>
                      {editingPlatform?.id === p.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="text"
                            value={editingPlatform.apiKey}
                            onChange={(e) => setEditingPlatform({ ...editingPlatform, apiKey: e.target.value })}
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="New API key"
                          />
                          <button
                            onClick={handleUpdatePlatformKey}
                            disabled={updatePlatformMutation.isPending}
                            className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPlatform(null)}
                            className="px-3 py-1.5 text-slate-500 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1.5">
                          {p.apiKey ? (
                            <>
                              <span className="font-mono text-[10px] text-indigo-300/70 truncate max-w-[200px]">
                                {revealedPlatforms.has(p.id) ? p.apiKey : "•".repeat(Math.min(32, p.apiKey.length))}
                              </span>
                              <button
                                onClick={() => toggleRevealPlatform(p.id)}
                                className="text-[10px] text-slate-500 hover:text-indigo-300 font-bold uppercase tracking-wider"
                              >
                                {revealedPlatforms.has(p.id) ? "Hide" : "Show"}
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">No API key set</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => setEditingPlatform({ id: p.id, apiKey: p.apiKey ?? "" })}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePlatform(p.id)}
                        disabled={deletePlatformMutation.isPending}
                        className="p-2 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showPlatformForm ? (
              <form onSubmit={handleCreatePlatform} className="flex flex-col md:flex-row gap-3 bg-black/30 p-4 border border-white/5 rounded-2xl">
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="Platform name (e.g. OpenAI)"
                  className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
                <input
                  type="text"
                  value={platformApiKey}
                  onChange={(e) => setPlatformApiKey(e.target.value)}
                  placeholder="API key (optional)"
                  className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <button
                  type="submit"
                  disabled={createPlatformMutation.isPending}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-xs transition-all disabled:opacity-50"
                >
                  {createPlatformMutation.isPending ? "Adding…" : "Add Platform"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPlatformForm(false)}
                  className="px-5 py-2.5 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowPlatformForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-xs transition-all"
              >
                <Plus size={14} />
                Add Platform
              </button>
            )}
          </div>

          {/* Webhook Configuration */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Bell size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Webhook Notifications</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Real-time Event Integrations</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Send CostPilot events to Slack or Discord channels. Configure webhooks to get notified about cost spikes, trial expirations, and more.
            </p>

            {webhooksLoading ? (
              <div className="text-center py-8 text-slate-500 text-sm">Loading webhooks…</div>
            ) : webhooks.length > 0 ? (
              <div className="space-y-3 mb-6">
                {webhooks.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-4 border border-white/5 rounded-2xl bg-white/[0.01]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{w.name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-wider bg-white/5 text-slate-400 border border-white/10">
                          {w.type}
                        </span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-wider ${w.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {w.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[400px]">{w.url}</div>
                      {w.events && <div className="text-[9px] text-slate-600 mt-0.5">Events: {w.events}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-sm mb-4">No webhooks configured yet.</div>
            )}

            {showWebhookForm ? (
              <form onSubmit={handleCreateWebhook} className="flex flex-col gap-3 bg-black/30 p-4 border border-white/5 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={webhookName}
                    onChange={(e) => setWebhookName(e.target.value)}
                    placeholder="Webhook name"
                    className="bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    required
                  />
                  <select
                    value={webhookType}
                    onChange={(e) => setWebhookType(e.target.value as "slack" | "discord")}
                    className="bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="slack">Slack</option>
                    <option value="discord">Discord</option>
                  </select>
                </div>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="Webhook URL (https://hooks.slack.com/…)"
                  className="bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
                <input
                  type="text"
                  value={webhookEvents}
                  onChange={(e) => setWebhookEvents(e.target.value)}
                  placeholder="Events (comma-separated, e.g. expense.created,platform.synced)"
                  className="bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={createWebhookMutation.isPending}
                    className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-xs transition-all disabled:opacity-50"
                  >
                    {createWebhookMutation.isPending ? "Creating…" : "Create Webhook"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWebhookForm(false)}
                    className="px-5 py-2.5 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowWebhookForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-xs transition-all"
              >
                <Plus size={14} />
                Add Webhook
              </button>
            )}
          </div>
        </div>

        {/* Sidebar settings */}
        <div className="lg:col-span-4 space-y-8">

          {/* General Workspace Options */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Regional & Currency</h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Primary Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                  <option>CAD (C$)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fiscal Cycle Start</label>
                <select className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none">
                  <option>1st of each Month</option>
                  <option>15th of each Month</option>
                  <option>Quarterly Calendars</option>
                </select>
              </div>
            </div>
          </div>

          {/* Secure Integrations */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Platform Security</h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Biometric Login</h4>
                  <p className="text-[9px] text-slate-500 leading-normal">Require face/touch ID login.</p>
                </div>
                <input type="checkbox" className="w-4 h-4 rounded text-indigo-500 bg-black border-white/10" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Session Recording</h4>
                  <p className="text-[9px] text-slate-500 leading-normal">Store user interactions for audits.</p>
                </div>
                <input type="checkbox" className="w-4 h-4 rounded text-indigo-500 bg-black border-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
