// Batch 1 "trustworthy core" behaviour on the live screens: role-aware actions,
// accessible controls, honest failure states and workspace-aware team flows.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const ws = vi.hoisted(() => ({
  value: {
    activeWorkspaceId: 5 as number | null,
    activeWorkspace: { id: 5, name: "Acme", slug: "acme-1a2b3c4d", role: "viewer" } as Record<string, unknown> | null,
    workspaces: [] as Record<string, unknown>[],
    activeRole: "viewer" as string | null,
    canWrite: false,
    canManage: false,
    status: "ready",
    setActiveWorkspaceId: vi.fn(),
    refetchWorkspaces: vi.fn(),
  },
}));
const api = vi.hoisted(() => ({
  expenses: { data: [] as unknown[], isLoading: false, isError: false, error: null as unknown, refetch: vi.fn() },
  platforms: { data: [] as unknown[], isLoading: false, isError: false, error: null as unknown, refetch: vi.fn() },
  members: { data: [] as unknown[], isLoading: false, isError: false, isSuccess: true, error: null, refetch: vi.fn() },
  createExpense: vi.fn(),
  invite: vi.fn(),
  acceptInvite: vi.fn(),
  invalidate: vi.fn(async () => undefined),
}));

vi.mock("@/context/workspace-context", () => ({ useWorkspace: () => ws.value }));
vi.mock("@clerk/react", () => ({ useAuth: () => ({ userId: "user-a" }), UserButton: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: api.invalidate }) }));
vi.mock("@/components/export-buttons", () => ({ ExportButtons: () => <span>export</span> }));
vi.mock("@workspace/api-client-react", () => {
  const mutation = (fn?: (...a: unknown[]) => unknown) => () => ({ mutateAsync: fn ?? vi.fn(), isPending: false });
  return {
    useListExpenses: () => api.expenses,
    useListPlatforms: () => api.platforms,
    useListProjects: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
    useListWorkspaceMembers: () => api.members,
    useCreateExpense: mutation((...a) => api.createExpense(...a)),
    useUpdateExpense: mutation(),
    useDeleteExpense: mutation(),
    useCreatePlatform: mutation(),
    useUpdatePlatform: mutation(),
    useDeletePlatform: mutation(),
    useCreateWorkspace: mutation(),
    useInviteToWorkspace: mutation((...a) => api.invite(...a)),
    useUpdateWorkspace: mutation(),
    useRemoveMember: mutation(),
    useLeaveWorkspace: mutation(),
    useDeleteWorkspaceById: mutation(),
    useAcceptInvite: mutation((...a) => api.acceptInvite(...a)),
    useGetInviteByToken: () => ({ data: { workspaceName: "Acme", workspaceSlug: "acme", email: "x@example.test", status: "pending", expiresAt: "2999-01-01T00:00:00Z" }, isLoading: false, isError: false }),
    getListExpensesQueryKey: () => ["expenses"],
    getListPlatformsQueryKey: () => ["platforms"],
    getListWorkspacesQueryKey: () => ["workspaces"],
    getListWorkspaceMembersQueryKey: (id: number) => ["members", id],
  };
});

import Expenses from "../expenses";
import Platforms, { safeHttpUrl } from "../platforms";
import Collaboration from "../collaboration";

const expense = { id: 1, workspaceId: 5, amount: 12.5, currency: "EUR", date: "2026-11-01", platformName: "AWS", description: "Nov" };

function setRole(role: "owner" | "admin" | "viewer") {
  ws.value = { ...ws.value, activeRole: role, canWrite: role !== "viewer", canManage: role !== "viewer",
    activeWorkspace: { ...(ws.value.activeWorkspace ?? {}), role } };
}

beforeEach(() => {
  ws.value.activeWorkspaceId = 5;
  ws.value.activeWorkspace = { id: 5, name: "Acme", slug: "acme-1a2b3c4d", role: "viewer" };
  setRole("viewer");
  api.expenses = { data: [expense], isLoading: false, isError: false, error: null, refetch: vi.fn() };
  api.platforms = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
  api.createExpense.mockReset();
});
afterEach(cleanup);

describe("role-appropriate actions", () => {
  it("shows a viewer no add, edit or delete controls and says the access is read-only", () => {
    render(<Expenses />);
    expect(screen.queryByRole("button", { name: /add expense/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^edit /i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^delete /i })).toBeNull();
    expect(screen.getByText(/read-only access/i)).toBeTruthy();
  });

  it("gives writers visible, labelled row actions reachable by keyboard", () => {
    setRole("admin");
    render(<Expenses />);
    const edit = screen.getByRole("button", { name: "Edit AWS on 2026-11-01" });
    const del = screen.getByRole("button", { name: "Delete AWS on 2026-11-01" });
    expect(edit.className).not.toMatch(/opacity-0/);
    expect(del.className).not.toMatch(/opacity-0/);
    expect(edit.tagName).toBe("BUTTON");
  });
});

describe("expense form validation and failed saves", () => {
  beforeEach(() => setRole("owner"));

  it("labels every field and shows inline errors with aria-invalid instead of saving", async () => {
    render(<Expenses />);
    fireEvent.click(screen.getByRole("button", { name: /^add expense$/i }));
    const dialog = screen.getByRole("dialog");
    for (const label of ["Vendor", "Project", "Type", "Amount *", "Currency *", "Date *", "Category", "Description"]) {
      expect(within(dialog).getByLabelText(label)).toBeTruthy();
    }
    fireEvent.change(within(dialog).getByLabelText("Amount *"), { target: { value: "1.234" } });
    await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save expense" })); });
    const amount = within(dialog).getByLabelText("Amount *");
    expect(amount.getAttribute("aria-invalid")).toBe("true");
    expect(within(dialog).getByText("Use at most 2 decimal places.")).toBeTruthy();
    expect(api.createExpense).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and shows the server's reason when a save is rejected", async () => {
    api.createExpense.mockRejectedValue({ status: 400, data: { error: "currency must be a 3-letter ISO 4217 code such as USD" } });
    render(<Expenses />);
    fireEvent.click(screen.getByRole("button", { name: /^add expense$/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Amount *"), { target: { value: "10" } });
    await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Save expense" })); });
    await waitFor(() => expect(within(dialog).getAllByText(/currency must be a 3-letter ISO 4217 code/).length).toBeGreaterThan(0));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(within(dialog).getByRole("alert").textContent).toMatch(/^Not saved:/);
    expect(within(dialog).getByLabelText("Currency *").getAttribute("aria-invalid")).toBe("true");
  });

  it("offers ISO currency codes in a picker rather than free text", () => {
    render(<Expenses />);
    fireEvent.click(screen.getByRole("button", { name: /^add expense$/i }));
    const currency = within(screen.getByRole("dialog")).getByLabelText("Currency *") as HTMLSelectElement;
    expect(currency.tagName).toBe("SELECT");
    expect([...currency.options].map(o => o.value)).toEqual(expect.arrayContaining(["USD", "EUR", "JPY"]));
  });
});

describe("vendor states", () => {
  it("shows an error with retry when vendors fail to load, never the empty state", () => {
    api.platforms = { data: [], isLoading: false, isError: true, error: { status: 500 }, refetch: vi.fn() };
    render(<Platforms />);
    expect(screen.getByRole("alert").textContent).toMatch(/could not be loaded/i);
    expect(screen.queryByText(/no vendors in this scope/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(api.platforms.refetch).toHaveBeenCalled();
  });

  it("only renders http(s) vendor links", () => {
    expect(safeHttpUrl("https://aws.amazon.com")).toBe("https://aws.amazon.com/");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,x")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
  });
});

describe("team and invitation flows", () => {
  it("explains Personal scope and offers workspace creation instead of a dead invite form", () => {
    ws.value = { ...ws.value, activeWorkspaceId: null, activeWorkspace: null, activeRole: "owner", canWrite: true, canManage: true };
    render(<Collaboration />);
    expect(screen.getByText(/personal expenses, which only you can see/i)).toBeTruthy();
    expect(screen.getByLabelText("Workspace name")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create workspace" })).toBeTruthy();
    expect(screen.queryByLabelText("Email addresses")).toBeNull();
  });

  it("hides invitation and removal controls from viewers", () => {
    api.members = { ...api.members, data: [
      { id: 1, workspaceId: 5, userId: "owner-1", email: "owner@example.test", role: "owner", status: "active", createdAt: "2026-11-01" },
      { id: 2, workspaceId: 5, userId: "user-a", email: "me@example.test", role: "viewer", status: "active", createdAt: "2026-11-01" },
    ] };
    render(<Collaboration />);
    expect(screen.queryByLabelText("Email addresses")).toBeNull();
    expect(screen.getByText(/only owners and admins can invite/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /remove|revoke/i })).toBeNull();
  });

  it("lets admins invite with labelled inputs and validates addresses before calling the API", async () => {
    setRole("admin");
    render(<Collaboration />);
    fireEvent.change(screen.getByLabelText("Email addresses"), { target: { value: "not-an-email" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Create invitation links" })); });
    expect(screen.getByRole("alert").textContent).toMatch(/check these addresses/i);
    expect(screen.getByLabelText("Email addresses").getAttribute("aria-invalid")).toBe("true");
  });

  it("shows created invitation links in a labelled panel with a copy button per link", async () => {
    setRole("owner");
    api.invite.mockResolvedValue({ id: 1, email: "dev@example.test", role: "viewer", token: "b".repeat(64), status: "pending", inviteUrl: "/accept-invite" });
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<Collaboration />);
    fireEvent.change(screen.getByLabelText("Email addresses"), { target: { value: "dev@example.test" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Create invitation links" })); });
    const panel = screen.getByRole("region", { name: "Private invitation links" });
    expect(within(panel).getByText(/accept-invite\?token=b{64}/)).toBeTruthy();
    await act(async () => { fireEvent.click(within(panel).getByRole("button", { name: "Copy invitation link for dev@example.test" })); });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("token=" + "b".repeat(64)));
  });
});
