import { useState } from "react";
import { useListProjects, useCreateProject, useDeleteProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/context/workspace-context";

export default function Projects() {
  const { activeWorkspaceId } = useWorkspace();
  const query = useListProjects();
  const create = useCreateProject();
  const remove = useDeleteProject();
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const projects = (query.data ?? []).filter(p => (p.workspaceId ?? null) === activeWorkspaceId);
  return <main className="space-y-6 p-6"><h1 className="text-3xl">Projects</h1>
    {query.isLoading && <p role="status">Loading projects...</p>}
    {(query.isError || error) && <p role="alert">{error || "Projects could not be loaded."}</p>}
    <form className="flex gap-3" onSubmit={async event => { event.preventDefault(); setError(""); try {
      await create.mutateAsync({ data: { name: name.trim(), ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}) } });
      setName(""); await cache.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    } catch { setError("Project could not be created. Check your workspace permissions."); } }}>
      <label>Project name <input className="rounded bg-slate-800 p-2" value={name} onChange={e => setName(e.target.value)} required maxLength={120} /></label>
      <button disabled={create.isPending || !name.trim()} className="rounded bg-indigo-600 p-2">Create project</button>
    </form>
    {!query.isLoading && !query.isError && projects.length === 0 && <p>No projects in this scope yet.</p>}
    <ul className="space-y-3">{projects.map(project => <li key={project.id} className="flex justify-between rounded border p-3">{project.name}
      <button disabled={remove.isPending} aria-label={`Delete ${project.name}`} onClick={async () => {
        if (!window.confirm(`Delete project ${project.name}? Its expenses will remain.`)) return;
        try { await remove.mutateAsync({ id: project.id }); await cache.invalidateQueries({ queryKey: getListProjectsQueryKey() }); }
        catch { setError("Project could not be deleted. Check your workspace permissions."); }
      }}>Delete</button></li>)}</ul>
  </main>;
}
