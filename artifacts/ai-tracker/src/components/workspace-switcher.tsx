import { useWorkspace } from "@/context/workspace-context";
import { useListWorkspaces, useCreateWorkspace } from "@workspace/api-client-react";
import { 
  ChevronDown, 
  Plus, 
  Users, 
  Check,
  Building2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useRef } from "react";
import { toast } from "sonner";

export function WorkspaceSwitcher({ isCollapsed }: { isCollapsed: boolean }) {
  const { data: workspaces } = useListWorkspaces() as any;
  const { activeWorkspaceId, setActiveWorkspaceId, activeWorkspace } = useWorkspace();
  const createWorkspace = useCreateWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    try {
      await createWorkspace.mutateAsync({ data: { name, slug } });
      toast.success("Workspace created!");
      setNewName("");
      setIsCreating(false);
    } catch {
      toast.error("Failed to create workspace.");
    }
  };

  return (
    <div className="mb-6">
      <DropdownMenu>
        <DropdownMenuTrigger className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition text-left focus:outline-none ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Building2 size={16} />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Workspace</div>
              <div className="text-sm font-semibold text-white truncate">{activeWorkspace?.name || "Select Workspace"}</div>
            </div>
          )}
          {!isCollapsed && <ChevronDown size={14} className="text-slate-500" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-[#09090b]/95 border-white/[0.1] text-slate-200 backdrop-blur-xl">
          <DropdownMenuLabel className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-2">My Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/[0.05]" />
          {workspaces?.map((w: any) => (
            <DropdownMenuItem 
              key={w.id} 
              onClick={() => setActiveWorkspaceId(w.id)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg focus:bg-white/[0.06] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-bold text-white">
                  {w.name.charAt(0)}
                </div>
                <span className="font-medium text-sm">{w.name}</span>
              </div>
              {w.id === activeWorkspaceId && <Check size={16} className="text-indigo-400" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-white/[0.05]" />
          {isCreating ? (
            <div className="px-3 py-2.5 flex items-center gap-2">
              <input
                ref={inputRef}
                autoFocus
                className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Workspace name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") { setIsCreating(false); setNewName(""); }
                }}
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || createWorkspace.isPending}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all"
              >
                {createWorkspace.isPending ? "…" : "Add"}
              </button>
            </div>
          ) : (
            <DropdownMenuItem
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg focus:bg-indigo-500/10 text-indigo-400 cursor-pointer"
            >
              <Plus size={16} />
              <span className="font-medium text-sm">Create Workspace</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
