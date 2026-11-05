import { useWorkspace } from "@/context/workspace-context";
import { useCreateAndSelectWorkspace } from "@/components/create-workspace-form";
import { ChevronDown, Plus, Check, Building2, AlertTriangle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", viewer: "Viewer" };

export function WorkspaceSwitcher({ isCollapsed }: { isCollapsed: boolean }) {
  const { activeWorkspaceId, setActiveWorkspaceId, activeWorkspace, workspaces, status, refetchWorkspaces } = useWorkspace();
  const { create, isPending } = useCreateAndSelectWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async () => {
    const message = await create(newName);
    setCreateError(message);
    if (!message) { setNewName(""); setIsCreating(false); }
  };

  const currentLabel = activeWorkspaceId === null
    ? "Personal"
    : activeWorkspace?.name ?? (status === "loading" ? "Loading…" : "Personal");

  return (
    <div className="mb-6">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Current scope: ${currentLabel}. Switch workspace`}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
            {status === "loading" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Building2 size={16} aria-hidden />}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">Workspace</div>
              <div className="text-sm font-semibold text-white truncate">{currentLabel}</div>
            </div>
          )}
          {!isCollapsed && <ChevronDown size={14} className="text-slate-400" aria-hidden />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72 bg-[#09090b]/95 border-white/[0.1] text-slate-200 backdrop-blur-xl">
          <DropdownMenuLabel className="text-xs font-medium text-slate-400 uppercase tracking-wider px-3 py-2">Scope</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => setActiveWorkspaceId(null)}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer"
          >
            <span className="font-medium text-sm">Personal expenses</span>
            {activeWorkspaceId === null && <Check size={16} className="text-indigo-300" aria-label="Selected" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/[0.05]" />
          <DropdownMenuLabel className="text-xs font-medium text-slate-400 uppercase tracking-wider px-3 py-2">Team workspaces</DropdownMenuLabel>
          {status === "loading" && <p className="px-3 py-2 text-sm text-slate-400" role="status">Loading workspaces…</p>}
          {status === "error" && (
            <div className="px-3 py-2 text-sm text-amber-200" role="alert">
              <p className="flex items-center gap-2"><AlertTriangle size={14} aria-hidden /> Workspaces could not be loaded.</p>
              <button type="button" onClick={refetchWorkspaces} className="mt-1 underline text-indigo-300">Try again</button>
            </div>
          )}
          {status === "ready" && workspaces.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">No team workspaces yet. Create one to share spend with your team.</p>
          )}
          {workspaces.map(w => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => setActiveWorkspaceId(w.id)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg focus:bg-white/[0.06] cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-bold text-white shrink-0" aria-hidden>
                  {w.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{w.name}</div>
                  {w.role && <div className="text-xs text-slate-400">{ROLE_LABEL[w.role] ?? w.role}</div>}
                </div>
              </div>
              {w.id === activeWorkspaceId && <Check size={16} className="text-indigo-300" aria-label="Selected" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-white/[0.05]" />
          {isCreating ? (
            <form
              className="px-3 py-2.5"
              onSubmit={e => { e.preventDefault(); void handleCreate(); }}
              onKeyDown={e => { e.stopPropagation(); if (e.key === "Escape") { setIsCreating(false); setNewName(""); setCreateError(null); } }}
            >
              <label htmlFor="new-workspace-name" className="block text-xs text-slate-300 mb-1">Workspace name</label>
              <div className="flex items-center gap-2">
                <input
                  id="new-workspace-name"
                  autoFocus
                  maxLength={80}
                  aria-invalid={createError ? true : undefined}
                  aria-describedby={createError ? "new-workspace-error" : undefined}
                  className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Platform team"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setCreateError(null); }}
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  {isPending ? "Creating…" : "Create"}
                </button>
              </div>
              {createError && <p id="new-workspace-error" role="alert" className="mt-1 text-xs text-red-300">{createError}</p>}
            </form>
          ) : (
            <DropdownMenuItem
              onSelect={e => { e.preventDefault(); setIsCreating(true); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg focus:bg-indigo-500/10 text-indigo-300 cursor-pointer"
            >
              <Plus size={16} aria-hidden />
              <span className="font-medium text-sm">Create workspace</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
