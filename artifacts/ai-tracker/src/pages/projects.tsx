import { useState } from "react";
import { useListProjects, useCreateProject, useDeleteProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Eye, Folder, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { apiErrorMessage } from "@/lib/api-error";

export default function Projects() {
  const { activeWorkspaceId, canWrite, activeRole } = useWorkspace();
  const query = useListProjects();
  const create = useCreateProject();
  const remove = useDeleteProject();
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const projects = (query.data ?? []).filter(p => (p.workspaceId ?? null) === activeWorkspaceId);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setNameError("Enter a project name."); return; }
    try {
      await create.mutateAsync({ data: { name: trimmed, ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}) } });
      setName("");
      setNameError(null);
      await cache.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast.success(`Project "${trimmed}" created.`);
    } catch (error) {
      setNameError(`Not saved: ${apiErrorMessage(error, "the project could not be created.")}`);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove.mutateAsync({ id });
      await cache.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setConfirmId(null);
      setDeleteError(null);
      toast.success("Project deleted. Its expenses are kept without a project.");
    } catch (error) {
      setDeleteError(apiErrorMessage(error, "The project could not be deleted."));
    }
  };

  return (
    <div className="pb-20 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
        <p className="text-sm text-slate-300 mt-1">Group expenses by product, team or client to see what each one costs.</p>
      </header>

      {canWrite ? (
        <form noValidate onSubmit={handleCreate} className="flex flex-col sm:flex-row sm:items-end gap-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:p-6">
          <div className="flex-1 min-w-0">
            <label htmlFor="project-name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Project name</label>
            <input
              id="project-name"
              className="w-full bg-white/[0.03] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 aria-[invalid=true]:border-red-400"
              value={name}
              maxLength={120}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "project-name-error" : undefined}
              onChange={e => { setName(e.target.value); setNameError(null); }}
            />
            {nameError && <p id="project-name-error" role="alert" className="mt-1.5 text-xs text-red-300">{nameError}</p>}
          </div>
          <button type="submit" disabled={create.isPending} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shrink-0">
            {create.isPending ? "Creating…" : "Create project"}
          </button>
        </form>
      ) : activeRole !== null && (
        <p className="text-sm text-slate-300 flex items-center gap-2"><Eye size={14} aria-hidden /> You have read-only access to this workspace's projects.</p>
      )}

      {query.isLoading && <p role="status" className="text-slate-300">Loading projects…</p>}
      {query.isError && (
        <div role="alert" className="text-sm text-amber-200 flex flex-wrap items-center gap-3">
          <AlertTriangle size={16} aria-hidden /> Projects could not be loaded: {apiErrorMessage(query.error, "please try again.")}
          <button type="button" onClick={() => void query.refetch()} className="underline text-indigo-300">Try again</button>
        </div>
      )}
      {deleteError && <p role="alert" className="text-sm text-red-200">{deleteError}</p>}
      {!query.isLoading && !query.isError && projects.length === 0 && <p className="text-slate-200">No projects in this scope yet.</p>}

      <ul className="space-y-3">
        {projects.map(project => (
          <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <span className="flex items-center gap-2 text-white font-medium min-w-0 break-words"><Folder size={16} className="text-indigo-300 shrink-0" aria-hidden />{project.name}</span>
            {canWrite && (confirmId === project.id ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-300">Delete? Expenses stay, without a project.</span>
                <button type="button" disabled={remove.isPending} onClick={() => void handleDelete(project.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50">Delete</button>
                <button type="button" onClick={() => setConfirmId(null)} className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-200 text-xs font-bold">Cancel</button>
              </span>
            ) : (
              <button type="button" aria-label={`Delete project ${project.name}`} onClick={() => { setDeleteError(null); setConfirmId(project.id); }}
                className="p-2 rounded-lg hover:bg-red-500/10 text-slate-300 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                <Trash2 size={14} aria-hidden />
              </button>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
