import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { useListWorkspaces, type Workspace } from "@workspace/api-client-react";
import { toast } from "sonner";

export type WorkspaceRole = "owner" | "admin" | "viewer";
export type ScopeStatus = "loading" | "ready" | "error";

interface WorkspaceContextType {
  activeWorkspaceId: number | null;
  setActiveWorkspaceId: (id: number | null) => void;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  /** Role in the active workspace; "owner" for Personal scope; null while unknown. */
  activeRole: WorkspaceRole | null;
  /** True when the current scope allows creating and editing records. */
  canWrite: boolean;
  /** True when the current scope allows managing members and workspace settings. */
  canManage: boolean;
  status: ScopeStatus;
  refetchWorkspaces: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

/** Per-account key so one account's selection never leaks into another's session. */
export function scopeStorageKey(userId: string | null | undefined) {
  return userId ? `costpilot.activeWorkspace.${userId}` : null;
}

export function readStoredScope(userId: string | null | undefined): number | null {
  const key = scopeStorageKey(userId);
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    const id = raw === null ? NaN : Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function writeStoredScope(userId: string | null | undefined, id: number | null) {
  const key = scopeStorageKey(userId);
  if (!key) return;
  try {
    if (id === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(id));
  } catch {
    // Storage can be unavailable (private mode); the selection then lasts for this visit only.
  }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const query = useListWorkspaces();
  const workspaces = useMemo(() => (Array.isArray(query.data) ? query.data : []), [query.data]);
  const [activeWorkspaceId, setActiveState] = useState<number | null>(() => readStoredScope(userId));
  const warned = useRef(false);

  const setActiveWorkspaceId = useCallback((id: number | null) => {
    setActiveState(id);
    writeStoredScope(userId, id);
  }, [userId]);

  // Once the authoritative list arrives, drop a saved workspace that was deleted or revoked.
  useEffect(() => {
    if (!query.isSuccess || activeWorkspaceId === null) return;
    if (!workspaces.some(w => w.id === activeWorkspaceId)) {
      setActiveWorkspaceId(null);
      if (!warned.current) {
        warned.current = true;
        toast.info("You no longer have access to the workspace you last used. Showing your personal expenses.");
      }
    }
  }, [query.isSuccess, workspaces, activeWorkspaceId, setActiveWorkspaceId]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) ?? null;
  const status: ScopeStatus = query.isError ? "error" : query.isSuccess ? "ready" : "loading";
  const activeRole: WorkspaceRole | null = activeWorkspaceId === null
    ? "owner"
    : (activeWorkspace?.role as WorkspaceRole | undefined) ?? null;
  const canManage = activeRole === "owner" || activeRole === "admin";

  const value: WorkspaceContextType = {
    activeWorkspaceId,
    setActiveWorkspaceId,
    activeWorkspace,
    workspaces,
    activeRole,
    canWrite: canManage,
    canManage,
    status,
    refetchWorkspaces: () => { void query.refetch(); },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
