import { useWorkspace } from "@/context/workspace-context";
import { useState } from "react";
import {
  useListPlatforms,
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
  getListPlatformsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Pencil, Trash2, Key, AlertTriangle, Eye } from "lucide-react";
import { apiErrorMessage } from "@/lib/api-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  notes: string;
};

const VENDOR_CATEGORIES = ["Cloud infrastructure", "AI / LLM API", "SaaS tool", "Database / data", "Observability", "Hosting / compute", "Other"];

/** Earlier categories stay selectable when editing older vendors. */
function vendorCategoryOptions(current: string) {
  return current && !VENDOR_CATEGORIES.includes(current) ? [current, ...VENDOR_CATEGORIES] : VENDOR_CATEGORIES;
}

/** Only http(s) links are rendered, so a stored javascript: or data: URL can never run. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const inputClass = "w-full bg-white/[0.03] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors aria-[invalid=true]:border-red-400";
const labelClass = "text-xs font-semibold text-slate-300 uppercase tracking-wider";

const emptyForm = (): FormState => ({
  name: "",
  category: "AI / LLM API",
  website: "",
  logoUrl: "",
  notes: "",
});

export default function Platforms() {
  const qc = useQueryClient();
  const { data: accessiblePlatforms = [], isLoading, isError, error, refetch } = useListPlatforms();
  const { activeWorkspaceId, canWrite, activeRole } = useWorkspace();
  const platforms = accessiblePlatforms.filter(p => (p.workspaceId ?? null) === activeWorkspaceId);
  const createMutation = useCreatePlatform();
  const updateMutation = useUpdatePlatform();
  const deleteMutation = useDeletePlatform();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Platform | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [nameError, setNameError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const saving = createMutation.isPending || updateMutation.isPending;

  const invalidate = () => qc.invalidateQueries({ queryKey: getListPlatformsQueryKey() });

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setNameError(null); setWebsiteError(null); setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Platform) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      category: p.category ?? "Other",
      website: p.website ?? "",
      logoUrl: p.logoUrl ?? "",
      notes: p.notes ?? "",
    });
    setNameError(null); setWebsiteError(null); setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const badName = name ? null : "Enter the vendor's name.";
    const badWebsite = form.website.trim() && !safeHttpUrl(form.website.trim()) ? "Enter a full web address starting with https://" : null;
    setNameError(badName); setWebsiteError(badWebsite);
    if (badName || badWebsite) { setFormError("Please fix the highlighted fields."); return; }
    const payload = {
      name,
      ...(form.category ? { category: form.category } : {}),
      ...(form.website ? { website: form.website } : {}),
      ...(form.logoUrl ? { logoUrl: form.logoUrl } : {}),
      ...(form.notes ? { notes: form.notes } : {}),
    };
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
        toast.success("Vendor updated.");
      } else {
        await createMutation.mutateAsync({ data: { ...payload, ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}) } });
        toast.success("Vendor added.");
      }
      await invalidate();
      setDialogOpen(false);
    } catch (err) {
      // Keep the dialog open with the entered values: nothing was saved.
      setFormError(`Not saved: ${apiErrorMessage(err, "please try again.")}`);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Vendor deleted.");
      await invalidate();
      setDeleteId(null);
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "The vendor was not deleted. Please try again."));
    }
  };

  return (
    <div className="pb-20">
      <header className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white">Vendors</h1>
          <p className="text-sm text-slate-300 mt-1">The cloud, AI and SaaS providers you pay. Link expenses to a vendor to see where money goes.</p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus size={16} aria-hidden />
            Add vendor
          </button>
        )}
      </header>

      {!canWrite && activeRole !== null && (
        <p className="mb-4 text-sm text-slate-300 flex items-center gap-2"><Eye size={14} aria-hidden /> You have read-only access to this workspace's vendors.</p>
      )}

      {isError ? (
        <div role="alert" className="py-8 px-6 text-sm text-amber-200 flex flex-wrap items-center gap-3 bg-white/[0.01] border border-amber-500/20 rounded-2xl">
          <AlertTriangle size={16} aria-hidden />
          <span>Vendors could not be loaded: {apiErrorMessage(error, "please try again.")}</span>
          <button type="button" onClick={() => void refetch()} className="underline text-indigo-300">Try again</button>
        </div>
      ) : isLoading ? (
        <div role="status" className="text-center py-12 text-slate-300 font-medium">Loading vendors…</div>
      ) : platforms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <div 
              key={platform.id} 
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-md transition-colors hover:bg-white/[0.04] flex flex-col justify-between min-h-[210px]"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    {platform.logoUrl ? (
                      <img 
                        src={platform.logoUrl} 
                        alt="" 
                        className="w-10 h-10 rounded-xl object-contain bg-white/[0.02] border border-white/[0.08]" 
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-xl ${getHashColor(platform.name)} flex items-center justify-center text-white font-bold text-lg shrink-0`} aria-hidden>
                        {platform.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="font-semibold text-white text-lg leading-tight break-words">
                        {platform.name}
                      </h2>
                      {platform.category && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-white/[0.04] border border-white/[0.08] text-indigo-300 inline-block mt-1">
                          {platform.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {canWrite && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(platform)}
                        aria-label={`Edit vendor ${platform.name}`}
                        className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        <Pencil size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteError(null); setDeleteId(platform.id); }}
                        aria-label={`Delete vendor ${platform.name}`}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-300 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-300 mt-4 line-clamp-2 leading-relaxed">
                  {platform.notes || <span className="text-slate-400 italic">No notes.</span>}
                </p>

                {platform.apiKey && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-slate-300">
                    <Key size={12} aria-hidden />
                    <span>Credential stored, encrypted. Automatic sync is not available yet.</span>
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.04] pt-4 mt-auto flex justify-between items-center">
                {safeHttpUrl(platform.website) ? (
                  <a
                    href={safeHttpUrl(platform.website)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-indigo-300 flex items-center gap-1 hover:text-indigo-200"
                  >
                    <ExternalLink size={12} aria-hidden />
                    Website<span className="sr-only"> for {platform.name} (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">No website</span>
                )}

              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 space-y-3 bg-white/[0.01] border border-white/[0.06] rounded-2xl">
          <p className="text-slate-200 font-medium">No vendors in this scope yet.</p>
          {canWrite && (
            <button type="button" onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl">
              <Plus size={16} aria-hidden /> Add your first vendor
            </button>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={open => { if (!saving) setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-zinc-950/95 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">{editTarget ? "Edit vendor" : "Add vendor"}</DialogTitle>
            <DialogDescription className="text-sm text-slate-300">Fields marked * are required.</DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={e => { e.preventDefault(); void handleSubmit(); }} className="space-y-4 py-2">
            {formError && <p role="alert" className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="vendor-name" className={labelClass}>Vendor name *</label>
                <input
                  id="vendor-name"
                  type="text"
                  className={inputClass}
                  placeholder="e.g. AWS, OpenAI, Datadog"
                  value={form.name}
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? "vendor-name-error" : undefined}
                  onChange={e => { setForm({ ...form, name: e.target.value }); setNameError(null); setFormError(null); }}
                />
                {nameError && <p id="vendor-name-error" className="text-xs text-red-300">{nameError}</p>}
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="vendor-category" className={labelClass}>Category</label>
                <select id="vendor-category" className={inputClass} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {vendorCategoryOptions(form.category).map(c => <option key={c} value={c} className="bg-zinc-950">{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="vendor-website" className={labelClass}>Website</label>
                <input
                  id="vendor-website"
                  type="url"
                  inputMode="url"
                  className={inputClass}
                  placeholder="https://aws.amazon.com"
                  value={form.website}
                  aria-invalid={websiteError ? true : undefined}
                  aria-describedby={websiteError ? "vendor-website-error" : undefined}
                  onChange={e => { setForm({ ...form, website: e.target.value }); setWebsiteError(null); setFormError(null); }}
                />
                {websiteError && <p id="vendor-website-error" className="text-xs text-red-300">{websiteError}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="vendor-logo" className={labelClass}>Logo URL</label>
                <input id="vendor-logo" type="url" inputMode="url" className={inputClass} placeholder="Optional image address" value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="vendor-notes" className={labelClass}>Notes</label>
                <textarea
                  id="vendor-notes"
                  className={`${inputClass} h-20 resize-none`}
                  placeholder="Contract terms, account owner, billing contact…"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <button type="button" onClick={() => setDialogOpen(false)} disabled={saving} className="px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl">
                {saving ? "Saving…" : editTarget ? "Save changes" : "Add vendor"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={open => { if (!open && !deleteMutation.isPending) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm bg-zinc-950/95 border border-white/[0.08] backdrop-blur-xl rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white tracking-tight">Delete this vendor?</DialogTitle>
            <DialogDescription className="text-sm text-slate-300">
              This is permanent and removes any stored credential. Expenses linked to this vendor are kept but will show "No vendor".
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p role="alert" className="text-sm text-red-200">{deleteError}</p>}
          <DialogFooter className="gap-2 mt-4">
            <button type="button" onClick={() => setDeleteId(null)} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white">Cancel</button>
            <button
              type="button"
              onClick={() => deleteId !== null && void handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl"
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
