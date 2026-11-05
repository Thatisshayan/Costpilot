import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListWorkspacesQueryKey, useCreateWorkspace } from "@workspace/api-client-react";
import { toast } from "sonner";
import { useWorkspace } from "@/context/workspace-context";
import { apiErrorMessage } from "@/lib/api-error";

/** Creates a workspace, refreshes the list and switches into it. Returns an error message or null. */
export function useCreateAndSelectWorkspace() {
  const queryClient = useQueryClient();
  const { setActiveWorkspaceId } = useWorkspace();
  const mutation = useCreateWorkspace();
  const create = async (rawName: string): Promise<string | null> => {
    const name = rawName.trim();
    if (!name) return "Enter a workspace name.";
    if (name.length > 80) return "Use 80 characters or fewer.";
    try {
      const created = await mutation.mutateAsync({ data: { name } });
      await queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
      setActiveWorkspaceId(created.id);
      toast.success(`Workspace "${created.name}" created and selected.`);
      return null;
    } catch (error) {
      return apiErrorMessage(error, "The workspace could not be created. Please try again.");
    }
  };
  return { create, isPending: mutation.isPending };
}

export function CreateWorkspaceForm({ idPrefix = "create-workspace" }: { idPrefix?: string }) {
  const { create, isPending } = useCreateAndSelectWorkspace();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = `${idPrefix}-name`;
  const errorId = `${idPrefix}-error`;
  return (
    <form
      className="flex flex-col sm:flex-row sm:items-end gap-3"
      onSubmit={async e => {
        e.preventDefault();
        const message = await create(name);
        setError(message);
        if (!message) setName("");
      }}
    >
      <div className="flex-1 min-w-0">
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300 mb-1.5">Workspace name</label>
        <input
          id={inputId}
          value={name}
          maxLength={80}
          onChange={e => { setName(e.target.value); setError(null); }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder="e.g. Platform team"
          className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.12] rounded-xl text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        {error && <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-300">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50 shrink-0"
      >
        {isPending ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
