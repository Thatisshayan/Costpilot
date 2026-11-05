import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const setActive = vi.hoisted(() => vi.fn());
const invalidate = vi.hoisted(() => vi.fn(async () => undefined));
const accept = vi.hoisted(() => vi.fn());
const setLocation = vi.hoisted(() => vi.fn());

vi.mock("wouter", () => ({ useLocation: () => ["/accept-invite", setLocation], useSearch: () => `token=${"a".repeat(64)}` }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: invalidate }) }));
vi.mock("@/context/workspace-context", () => ({ useWorkspace: () => ({ setActiveWorkspaceId: setActive }) }));
vi.mock("@workspace/api-client-react", () => ({
  getListWorkspacesQueryKey: () => ["workspaces"],
  useAcceptInvite: () => ({ mutateAsync: accept, isPending: false }),
  useGetInviteByToken: () => ({ data: { workspaceName: "Acme", workspaceSlug: "acme", email: "x@example.test", status: "pending", expiresAt: "2999-01-01T00:00:00Z" }, isLoading: false, isError: false }),
}));

import AcceptInvite from "../accept-invite";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("accepting an invitation", () => {
  it("refreshes the workspace list and switches into the joined workspace", async () => {
    accept.mockResolvedValue({ message: "Invite accepted", member: { workspaceId: 42 } });
    render(<AcceptInvite />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /accept/i })); });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["workspaces"] });
    expect(setActive).toHaveBeenCalledWith(42);
    fireEvent.click(screen.getByRole("button", { name: /go to workspace overview/i }));
    expect(setLocation).toHaveBeenCalledWith("/");
  });

  it("shows the server's reason and does not switch scope when acceptance fails", async () => {
    accept.mockRejectedValue({ status: 400, data: { error: "Invite is invalid, expired or already consumed" } });
    render(<AcceptInvite />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /accept/i })); });
    expect(setActive).not.toHaveBeenCalled();
    expect(screen.getAllByText(/invalid, expired or already consumed/i).length).toBeGreaterThan(0);
  });
});
