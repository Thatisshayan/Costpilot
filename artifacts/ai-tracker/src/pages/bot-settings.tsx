import { useState } from 'react';
import {
  MessageSquare,
  Bell,
  Plus,
  X,
  Loader2,
  Trash2,
  Pencil,
  Send,
  CheckCircle2,
  Slack,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListWebhooks,
  useCreateWebhook,
  getListWebhooksQueryKey,
} from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";
import { useWorkspace } from "@/context/workspace-context";

const EVENT_OPTIONS = [
  { value: 'budget_threshold', label: 'Budget Thresholds' },
  { value: 'anomaly_detected', label: 'Anomaly Detection' },
  { value: 'large_expense', label: 'Large Expenses (>$100)' },
  { value: 'expiring_trials', label: 'Trial Expirations' },
  { value: 'platform_synced', label: 'Platform Sync' },
  { value: 'spending_spike', label: 'Spending Spikes' },
];

interface WebhookFormData {
  name: string;
  type: "slack" | "discord";
  url: string;
  events: string[];
}

const defaultForm: WebhookFormData = {
  name: "",
  type: "slack",
  url: "",
  events: [],
};

export default function BotSettings() {
  const qc = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const { data: webhooks = [], isLoading } = useListWebhooks();
  const createMutation = useCreateWebhook();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<WebhookFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (wh: typeof webhooks[0]) => {
    setForm({
      name: wh.name,
      type: wh.type,
      url: wh.url,
      events: wh.events === "all" ? EVENT_OPTIONS.map(e => e.value) : wh.events.split(",").map(e => e.trim()),
    });
    setEditingId(wh.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!activeWorkspaceId || !form.name || !form.url) {
      toast.error("Name and URL are required.");
      return;
    }

    const eventsValue = form.events.length === EVENT_OPTIONS.length ? "all" : form.events.join(",");
    setSaving(true);

    try {
      if (editingId) {
        await customFetch(`/api/notifications/${editingId}?workspaceId=${activeWorkspaceId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name,
            url: form.url,
            events: eventsValue,
          }),
        });
        toast.success("Notification channel updated.");
      } else {
        await createMutation.mutateAsync({
          data: {
            workspaceId: activeWorkspaceId,
            name: form.name,
            url: form.url,
            type: form.type,
            events: eventsValue,
          },
        });
        toast.success("Notification channel created.");
      }
      qc.invalidateQueries({ queryKey: getListWebhooksQueryKey() });
      setShowModal(false);
      resetForm();
    } catch {
      toast.error(editingId ? "Failed to update channel." : "Failed to create channel.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!activeWorkspaceId) return;
    try {
      await customFetch(`/api/notifications/${id}?workspaceId=${activeWorkspaceId}`, {
        method: "DELETE",
      });
      qc.invalidateQueries({ queryKey: getListWebhooksQueryKey() });
      toast.success("Notification channel removed.");
    } catch {
      toast.error("Failed to remove channel.");
    }
  };

  const handleToggleActive = async (wh: typeof webhooks[0]) => {
    if (!activeWorkspaceId) return;
    try {
      await customFetch(`/api/notifications/${wh.id}?workspaceId=${activeWorkspaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !wh.isActive }),
      });
      qc.invalidateQueries({ queryKey: getListWebhooksQueryKey() });
      toast.success(wh.isActive ? "Channel disabled." : "Channel enabled.");
    } catch {
      toast.error("Failed to toggle channel.");
    }
  };

  const handleTest = async (webhookId: number) => {
    setTestingId(webhookId);
    try {
      const res = await customFetch<{ success: boolean; message: string }>("/api/notifications/test", {
        method: "POST",
        body: JSON.stringify({ webhookId }),
      });
      toast.success(res.message);
    } catch {
      toast.error("Failed to send test notification.");
    } finally {
      setTestingId(null);
    }
  };

  const toggleEvent = (value: string) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(value)
        ? prev.events.filter(e => e !== value)
        : [...prev.events, value],
    }));
  };

  const selectedEventsLabel = form.events.length === EVENT_OPTIONS.length
    ? "All events"
    : form.events.length === 0
      ? "No events selected"
      : `${form.events.length} event${form.events.length > 1 ? "s" : ""} selected`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Notification Channels</h1>
          <p className="text-slate-400 text-sm max-w-lg">
            Configure Slack and Discord webhooks to receive real-time alerts about cost anomalies, budget thresholds, trial expirations, and spending spikes.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg shrink-0"
        >
          <Plus size={18} />
          Add Channel
        </button>
      </header>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md animate-pulse">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 bg-white/5 rounded-lg" />
                  <div className="h-3 w-32 bg-white/5 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-2 pt-8 border-t border-white/[0.05]">
                <div className="h-6 w-20 bg-white/5 rounded-lg" />
                <div className="h-6 w-20 bg-white/5 rounded-lg" />
                <div className="h-6 w-20 bg-white/5 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-16 backdrop-blur-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-6">
            <Bell size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No notification channels</h2>
          <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
            Connect Slack or Discord to get real-time alerts about your cloud costs, anomalies, and budget thresholds.
          </p>
          <button
            onClick={openCreate}
            className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all inline-flex items-center gap-2 shadow-lg"
          >
            <Plus size={18} />
            Add your first channel
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {webhooks.map((wh) => {
            const eventList = wh.events === "all"
              ? EVENT_OPTIONS.map(e => e.label)
              : wh.events.split(",").map(e => {
                  const opt = EVENT_OPTIONS.find(o => o.value === e.trim());
                  return opt ? opt.label : e.trim();
                });

            return (
              <div
                key={wh.id}
                className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-8 backdrop-blur-md hover:bg-white/[0.03] transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${wh.type === "slack" ? "bg-[#4A154B]/20 text-[#4A154B]" : "bg-[#5865F2]/20 text-[#5865F2]"}`}>
                      {wh.type === "slack" ? <Slack size={28} /> : <MessageSquare size={28} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{wh.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${wh.isActive ? "text-emerald-400" : "text-slate-500"}`}>
                          {wh.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-xs text-slate-500 font-medium capitalize">{wh.type}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-xs text-slate-500 font-mono truncate max-w-[200px]">{wh.url}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(wh.id)}
                      disabled={testingId === wh.id}
                      className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-indigo-400 transition-all disabled:opacity-50"
                      title="Test notification"
                    >
                      {testingId === wh.id ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                    <button
                      onClick={() => handleToggleActive(wh)}
                      className={`p-2.5 rounded-xl transition-all ${wh.isActive ? "bg-white/5 text-emerald-400 hover:bg-emerald-500/10" : "bg-white/5 text-slate-500 hover:text-white"}`}
                      title={wh.isActive ? "Disable" : "Enable"}
                    >
                      <Wifi size={18} />
                    </button>
                    <button
                      onClick={() => openEdit(wh)}
                      className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(wh.id)}
                      className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-red-400 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/[0.05]">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Alert Events</div>
                  <div className="flex flex-wrap gap-2">
                    {eventList.map((label) => (
                      <span
                        key={label}
                        className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/10"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) { setShowModal(false); resetForm(); } }} />
          <div className="relative bg-[#09090b] border border-white/[0.08] rounded-[2rem] p-8 w-full max-w-lg shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  {editingId ? <Pencil size={20} /> : <Bell size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{editingId ? "Edit Channel" : "Add Channel"}</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                    {editingId ? "Update notification settings" : "Configure a new notification channel"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { if (!saving) { setShowModal(false); resetForm(); } }}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Channel Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. #finops-alerts"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Platform</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "slack" | "discord" })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                >
                  <option value="slack">Slack</option>
                  <option value="discord">Discord</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Webhook URL</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder={form.type === "slack" ? "https://hooks.slack.com/services/..." : "https://discord.com/api/webhooks/..."}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-slate-600 font-mono"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Events</label>
                  <span className="text-[10px] text-slate-600 font-medium">{selectedEventsLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_OPTIONS.map((event) => (
                    <label
                      key={event.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                        form.events.includes(event.value)
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                          : "bg-white/[0.02] border-white/[0.05] text-slate-400 hover:bg-white/[0.04]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.events.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                        className="w-3.5 h-3.5 rounded border-white/20 bg-black/40 text-indigo-500 focus:ring-indigo-500/50"
                      />
                      <span className="text-[11px] font-medium">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/[0.05]">
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.url}
                className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {saving ? "Saving..." : editingId ? "Update Channel" : "Create Channel"}
              </button>
              <button
                onClick={() => { if (!saving) { setShowModal(false); resetForm(); } }}
                className="px-6 py-3 text-slate-400 hover:text-white rounded-xl text-sm font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
