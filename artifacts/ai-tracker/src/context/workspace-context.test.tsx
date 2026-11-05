import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

const auth = vi.hoisted(() => ({ userId: "user-a" as string | null }));
const list = vi.hoisted(() => ({
  state: { data: undefined as unknown, isSuccess: false, isError: false, refetch: vi.fn() },
}));
const toastInfo = vi.hoisted(() => vi.fn());

vi.mock("@clerk/react", () => ({ useAuth: () => auth }));
vi.mock("sonner", () => ({ toast: { info: toastInfo, success: vi.fn(), error: vi.fn() } }));
vi.mock("@workspace/api-client-react", () => ({ useListWorkspaces: () => list.state }));

import { WorkspaceProvider, scopeStorageKey, useWorkspace } from "./workspace-context";

function Probe() {
  const { activeWorkspaceId, activeRole, canWrite, canManage, status, setActiveWorkspaceId } = useWorkspace();
  return (
    <div>
      <p data-testid="active">{String(activeWorkspaceId)}</p>
      <p data-testid="role">{String(activeRole)}</p>
      <p data-testid="write">{String(canWrite)}</p>
      <p data-testid="manage">{String(canManage)}</p>
      <p data-testid="status">{status}</p>
      <button onClick={() => setActiveWorkspaceId(9)}>select 9</button>
    </div>
  );
}

const ready = (data: unknown) => { list.state = { data, isSuccess: true, isError: false, refetch: vi.fn() }; };

beforeEach(() => { window.localStorage.clear(); auth.userId = "user-a"; toastInfo.mockClear(); });
afterEach(cleanup);

describe("workspace scope persistence", () => {
  it("restores the saved workspace after a reload and exposes the caller's role", () => {
    window.localStorage.setItem(scopeStorageKey("user-a")!, "7");
    ready([{ id: 7, name: "Acme", slug: "acme-1", role: "viewer" }]);
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(screen.getByTestId("active").textContent).toBe("7");
    expect(screen.getByTestId("role").textContent).toBe("viewer");
    expect(screen.getByTestId("write").textContent).toBe("false");
    expect(screen.getByTestId("manage").textContent).toBe("false");
  });

  it("persists a new selection per account", () => {
    ready([{ id: 9, name: "Beta", slug: "beta-1", role: "admin" }]);
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    act(() => screen.getByText("select 9").click());
    expect(window.localStorage.getItem(scopeStorageKey("user-a")!)).toBe("9");
    expect(window.localStorage.getItem(scopeStorageKey("user-b")!)).toBeNull();
    expect(screen.getByTestId("write").textContent).toBe("true");
  });

  it("falls back to Personal with a notice when the saved workspace was deleted or access was revoked", () => {
    window.localStorage.setItem(scopeStorageKey("user-a")!, "7");
    ready([{ id: 8, name: "Other", slug: "other-1", role: "owner" }]);
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(screen.getByTestId("active").textContent).toBe("null");
    expect(window.localStorage.getItem(scopeStorageKey("user-a")!)).toBeNull();
    expect(toastInfo).toHaveBeenCalledTimes(1);
  });

  it("does not read another account's saved workspace", () => {
    window.localStorage.setItem(scopeStorageKey("user-a")!, "7");
    auth.userId = "user-b";
    ready([{ id: 7, name: "Acme", slug: "acme-1", role: "owner" }]);
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(screen.getByTestId("active").textContent).toBe("null");
  });

  it("reports loading and error states and keeps writes disabled until the role is known", () => {
    window.localStorage.setItem(scopeStorageKey("user-a")!, "7");
    list.state = { data: undefined, isSuccess: false, isError: false, refetch: vi.fn() };
    const view = render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(screen.getByTestId("status").textContent).toBe("loading");
    expect(screen.getByTestId("role").textContent).toBe("null");
    expect(screen.getByTestId("write").textContent).toBe("false");
    list.state = { data: undefined, isSuccess: false, isError: true, refetch: vi.fn() };
    view.rerender(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(screen.getByTestId("status").textContent).toBe("error");
  });

  it("treats Personal scope as fully writable by its owner", () => {
    ready([]);
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(screen.getByTestId("role").textContent).toBe("owner");
    expect(screen.getByTestId("write").textContent).toBe("true");
  });
});
