import React, { createContext, useContext, useState, useEffect } from "react";
import { useListWorkspaces, Workspace } from "@workspace/api-client-react";

interface WorkspaceContextType {
  activeWorkspaceId: number | null;
  setActiveWorkspaceId: (id: number | null) => void;
  activeWorkspace: Workspace | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: workspaces } = useListWorkspaces() as { data: Workspace[] | undefined };
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);

  useEffect(() => {
    if (workspaces && workspaces.length > 0 && activeWorkspaceId === null) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId) ?? null;

  return (
    <WorkspaceContext.Provider value={{ activeWorkspaceId, setActiveWorkspaceId, activeWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
