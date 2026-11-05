import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const setActive = vi.hoisted(() => vi.fn());
const invalidate = vi.hoisted(() => vi.fn(async () => undefined));
const create = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: invalidate }) }));
vi.mock("@/context/workspace-context", () => ({ useWorkspace: () => ({ setActiveWorkspaceId: setActive }) }));
vi.mock("@workspace/api-client-react", () => ({
  getListWorkspacesQueryKey: () => ["workspaces"],
  useCreateWorkspace: () => ({ mutateAsync: create, isPending: false }),
}));

import { CreateWorkspaceForm } from "./create-workspace-form";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("creating a workspace", () => {
  it("sends only the name, refreshes the list and switches into the new workspace", async () => {
    create.mockResolvedValue({ id: 31, name: "Acme", slug: "acme-0011aabb" });
    render(<CreateWorkspaceForm />);
    fireEvent.change(screen.getByLabelText("Workspace name"), { target: { value: "  Acme " } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Create workspace" })); });
    expect(create).toHaveBeenCalledWith({ data: { name: "Acme" } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["workspaces"] });
    expect(setActive).toHaveBeenCalledWith(31);
  });

  it("shows the server's reason inline and stays in the current scope when creation fails", async () => {
    create.mockRejectedValue({ status: 400, data: { message: "Workspace name must be 1 to 80 characters." } });
    render(<CreateWorkspaceForm />);
    fireEvent.change(screen.getByLabelText("Workspace name"), { target: { value: "x" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Create workspace" })); });
    expect(screen.getByRole("alert").textContent).toBe("Workspace name must be 1 to 80 characters.");
    expect(screen.getByLabelText("Workspace name").getAttribute("aria-invalid")).toBe("true");
    expect(setActive).not.toHaveBeenCalled();
  });

  it("rejects a blank name without calling the API", async () => {
    render(<CreateWorkspaceForm />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Create workspace" })); });
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Enter a workspace name.");
  });
});
