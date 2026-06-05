import { useState } from "react";
import {
  useListPlatforms,
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
  useSyncPlatformUsage,
  getListPlatformsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Pencil, Trash2, RefreshCw, Key, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Platform = {
  id: number;
  name: string;
  category?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  apiKey?: string | null;
  notes?: string | null;
  createdAt?: string;
};

type FormState = {
  name: string;
  category: string;
  website: string;
  logoUrl: string;
  apiKey: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  name: "",
  category: "LLM Provider",
  website: "",
  logoUrl: "",
  apiKey: "",
  notes: "",
});

export default function Platforms() {
  const qc = useQueryClient();
  const { data: platforms = [], isLoading } = useListPlatforms();
  const createMutation = useCreatePlatform();
  const updateMutation = useUpdatePlatform();
  const deleteMutation = useDeletePlatform();
  const syncMutation = useSyncPlatformUsage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Platform | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (p: Platform) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      category: p.category ?? "LLM Provider",
      website: p.website ?? "",
      logoUrl: p.logoUrl ?? "",
      apiKey: p.apiKey ?? "",
      notes: p.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error("Platform name is required.");
      return;
    }
    const payload = {
      name: form.name,
      ...(form.category ? { category: form.category } : {}),
      ...(form.website ? { website: form.website } : {}),
      ...(form.logoUrl ? { logoUrl: form.logoUrl } : {}),
      ...(form.apiKey ? { apiKey: form.apiKey } : {}),
      ...(form.notes ? { notes: form.notes } : {}),
    };
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
        toast.success("Platform updated successfully.");
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast.success("Platform created successfully.");
      }
      invalidate();
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save platform.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Platform deleted.");
      invalidate();
    } catch {
      toast.error("Failed to delete platform.");
    }
    setDeleteId(null);
  };

  const handleSync = async (id: number) => {
    setSyncingId(id);
    try {
      const res = await syncMutation.mutateAsync({ id });
      if (res.success) {
        toast.success(res.message || "Platform usage synced successfully.");
        // Invalidate dashboard totals so sync changes propagate
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      } else {
        toast.error(res.message || "Auto-sync failed.");
      }
    } catch (err) {
      toast.error("Auto-sync request failed.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Vendor Intelligence</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your AI service ecosystem and API credentials.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/15"
        >
          <Plus size={16} />
          Add Platform
        </button>
      </header>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Loading platforms...</div>
      ) : platforms && platforms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <div 
              key={platform.id} 
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.04] flex flex-col justify-between h-[230px] group relative"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {platform.logoUrl ? (
                      <img 
                        src={platform.logoUrl} 
                        alt={platform.name} 
                        className="w-10 h-10 rounded-xl object-contain bg-white/[0.02] border border-white/[0.08]" 
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-xl ${getHashColor(platform.name)} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                        {platform.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-white text-lg leading-tight flex items-center gap-1.5">
                        {platform.name}
                      </h3>
                      {platform.category && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-white/[0.04] border border-white/[0.08] text-indigo-300 inline-block mt-1">
                          {platform.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(platform)}
                      className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors"
                      title="Edit Platform"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(platform.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete Platform"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mt-4 line-clamp-2 leading-relaxed">
                  {platform.notes || <span className="text-slate-600 italic">No notes configured.</span>}
                </p>

                {platform.apiKey && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-emerald-400">
                    <Key size={12} />
                    <span>API Connection Configured</span>
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.04] pt-4 mt-auto flex justify-between items-center">
                {platform.website ? (
                  <a 
                    href={platform.website} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs font-medium text-indigo-400 flex items-center gap-1 hover:text-indigo-300 transition-colors"
                  >
                    <ExternalLink size={12} />
                    Visit Website
                  </a>
                ) : (
                  <span className="text-xs text-slate-600">No website</span>
                )}

                {/* Only display Sync trigger if API Key is populated */}
                {platform.apiKey && (
                  <button
                    disabled={syncingId !== null}
                    onClick={() => handleSync(platform.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={syncingId === platform.id ? "animate-spin" : ""} />
                    {syncingId === platform.id ? "Syncing…" : "Auto-Sync"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 font-medium bg-white/[0.01] border border-white/[0.05] rounded-2xl">
          No platforms configured yet.
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950/90 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">
              {editTarget ? "Edit Platform Settings" : "Configure AI Platform"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform Name *</label>
                <input
                  type="text"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder="e.g. OpenAI, Anthropic, Midjourney"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                <select
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="LLM Provider" className="bg-zinc-950 text-white">LLM Provider</option>
                  <option value="Image Generator" className="bg-zinc-950 text-white">Image Generator</option>
                  <option value="Vector DB" className="bg-zinc-950 text-white">Vector DB</option>
                  <option value="Hosting / Compute" className="bg-zinc-950 text-white">Hosting / Compute</option>
                  <option value="API Gateway" className="bg-zinc-950 text-white">API Gateway</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Website URL</label>
                <input
                  type="url"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder="https://openai.com"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logo URL</label>
                <input
                  type="url"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder="Logo image URL"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Key size={12} className="text-indigo-400" /> API Secret Key
                  </label>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                    <Shield size={10} className="text-slate-500" /> Kept secure & encrypted
                  </span>
                </div>
                <input
                  type="password"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-emerald-400"
                  placeholder="sk-proj-..."
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes & Descriptions</label>
                <textarea
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all h-20 resize-none"
                  placeholder="Add details about model rates, API tiers, etc."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4.5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/15"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : editTarget ? "Save Changes" : "Log Platform"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm bg-zinc-950/90 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white tracking-tight">Delete platform connection?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400 mt-2">This action is permanent and will delete all stored keys. Expenses linked to this platform will lose their parent metadata references.</p>
          <DialogFooter className="gap-2 mt-4">
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteId !== null && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-red-600/15"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper to generate a consistent color based on string
function getHashColor(str: string) {
  const colors = [
    "bg-[#10a37f]", // OpenAI green
    "bg-[#cc9966]", // Anthropic beige
    "bg-[#1a1b1f]", // Midjourney dark
    "bg-[#6366f1]", // Indigo
    "bg-[#ec4899]", // Pink
    "bg-[#8b5cf6]", // Purple
    "bg-[#f59e0b]", // Amber
    "bg-[#0ea5e9]", // Sky
    "bg-[#4f6ef7]", // DeepSeek blue
    "bg-[#ff6b4a]", // Mistral orange
    "bg-[#ff4405]", // Groq orange-red
    "bg-[#8b5cf6]", // Together AI purple
    "bg-[#ffd700]", // Replicate gold
    "bg-[#1a1b2f]", // Stability AI dark
    "bg-[#4285f4]", // Google blue
    "bg-[#39594d]", // Cohere green
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
