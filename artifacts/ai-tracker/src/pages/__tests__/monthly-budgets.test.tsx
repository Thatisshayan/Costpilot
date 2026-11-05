// Batch 3 budgets page: exact status per currency, role-aware actions, inline validation.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const ws = vi.hoisted(() => ({
  value: { activeWorkspaceId: 5 as number | null, activeWorkspace: { id: 5, name: "Platform" } as { id: number; name: string } | null, activeRole: "owner" as string | null, canWrite: true },
}));
const api = vi.hoisted(() => ({
  statusCalls: [] as unknown[],
  result: { data: undefined as unknown, isLoading: false, isError: false, error: null as unknown, refetch: (() => undefined) as () => unknown },
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  invalidate: vi.fn(async () => undefined),
}));

vi.mock("@/context/workspace-context", () => ({ useWorkspace: () => ws.value }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: api.invalidate }) }));
vi.mock("@workspace/api-client-react", () => ({
  useGetBudgetStatus: (params: unknown) => { api.statusCalls.push(params); return api.result; },
  useListProjects: () => ({ data: [{ id: 3, workspaceId: 5, name: "Checkout" }, { id: 9, workspaceId: null, name: "Personal side project" }] }),
  useCreateBudget: () => ({ mutateAsync: api.create, isPending: false }),
  useUpdateBudget: () => ({ mutateAsync: api.update, isPending: false }),
  useDeleteBudget: () => ({ mutateAsync: api.remove, isPending: false }),
  getGetBudgetStatusQueryKey: () => ["/api/budgets/status"],
  // Imported by the dashboard module that provides the month helpers.
  useGetSpendSummary: () => ({}),
}));

import MonthlyBudgets from "../monthly-budgets";

const budget = (extra: Record<string, unknown> = {}) => ({
  id: 1, workspaceId: 5, projectId: null, projectName: null, name: "Cloud", period: "monthly", currency: "USD", amount: "100.00",
  thresholds: [50, 80, 100], createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", ...extra,
});
const status = (extra: Record<string, unknown> = {}) => ({
  budget: budget(), net: "80.30", charges: "100.30", credits: "-20.00", count: 3, remaining: "19.70", percentUsed: 80.3, thresholdReached: 80, state: "alert", ...extra,
});
const report = (budgets: unknown[]) => ({ workspaceId: 5, period: { month: "2026-09", start: "2026-09-01", end: "2026-09-30", through: "2026-09-12", isPartial: true }, budgets });
const ok = (budgets: unknown[]) => ({ data: report(budgets), isLoading: false, isError: false, error: null, refetch: vi.fn() });

beforeEach(() => {
  ws.value = { activeWorkspaceId: 5, activeWorkspace: { id: 5, name: "Platform" }, activeRole: "owner", canWrite: true };
  api.statusCalls = [];
  api.result = ok([]);
  api.create.mockReset().mockResolvedValue({});
  api.update.mockReset().mockResolvedValue({});
  api.remove.mockReset().mockResolvedValue(undefined);
  api.invalidate.mockClear();
});
afterEach(cleanup);

describe("budget status", () => {
  it("asks for the active scope and the server's current month by default", () => {
    render(<MonthlyBudgets />);
    expect(api.statusCalls.at(-1)).toEqual({ workspaceId: 5 });
    const options = [...(screen.getByLabelText("Month") as HTMLSelectElement).options];
    expect(options[0]).toMatchObject({ value: "" });
    expect(options[0].text).toContain("September 2026 (month to date)");
    expect(options.some(o => o.value > "2026-09")).toBe(false);
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2026-08" } });
    expect(api.statusCalls.at(-1)).toEqual({ workspaceId: 5, month: "2026-08" });
  });

  it("shows exact spent, remaining, refunds and the threshold reached", () => {
    api.result = ok([status()]);
    render(<MonthlyBudgets />);
    const card = screen.getByRole("listitem");
    expect(card.textContent).toContain("$80.30 of $100.00 (80.3%)");
    expect(card.textContent).toContain("$19.70 remaining");
    expect(card.textContent).toContain("refunds/credits -$20.00");
    expect(card.textContent).toContain("Threshold reached (80%)");
    expect(within(card).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("80.3");
  });

  it("states how far over a budget is, in its own currency, and caps the bar", () => {
    api.result = ok([status({ budget: budget({ currency: "JPY", amount: "1000.00", projectName: "Checkout" }), net: "1500.00", remaining: "-500.00", percentUsed: 150, thresholdReached: 100, state: "over" })]);
    render(<MonthlyBudgets />);
    const card = screen.getByRole("listitem");
    expect(card.textContent).toContain("Over by ¥500");
    expect(card.textContent).toContain("Project: Checkout · JPY");
    expect(card.textContent).toContain("Over budget");
    expect(within(card).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
  });

  it("has distinct empty, loading and error states", () => {
    const view = render(<MonthlyBudgets />);
    expect(screen.getByText(/No budgets yet in Platform/)).toBeTruthy();
    api.result = { data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() };
    view.rerender(<MonthlyBudgets />);
    expect(screen.getByRole("status").textContent).toContain("Loading budgets");
    const refetch = vi.fn();
    api.result = { data: undefined, isLoading: false, isError: true, error: { status: 403, data: { message: "Workspace membership required" } }, refetch };
    view.rerender(<MonthlyBudgets />);
    expect(screen.getByRole("alert").textContent).toContain("Workspace membership required");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe("roles", () => {
  it("lets viewers read but not create, edit or delete", () => {
    ws.value = { ...ws.value, activeRole: "viewer", canWrite: false };
    api.result = ok([status()]);
    render(<MonthlyBudgets />);
    expect(screen.queryByRole("heading", { name: "New monthly budget" })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit budget/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete budget/i })).toBeNull();
    expect(screen.getByText(/viewer role can view budgets/)).toBeTruthy();
  });

  it("asks for confirmation before deleting", async () => {
    api.result = ok([status()]);
    render(<MonthlyBudgets />);
    fireEvent.click(screen.getByRole("button", { name: "Delete budget Cloud" }));
    expect(api.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete budget" }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith({ id: 1 }));
  });
});

describe("creating and editing", () => {
  it("validates inline without calling the API", () => {
    render(<MonthlyBudgets />);
    fireEvent.change(screen.getByLabelText("Monthly amount"), { target: { value: "1.234" } });
    fireEvent.change(screen.getByLabelText("Alert thresholds (%)"), { target: { value: "80, 50" } });
    fireEvent.click(screen.getByRole("button", { name: "Create budget" }));
    expect(api.create).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Monthly amount").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/increasing percentages/)).toBeTruthy();
  });

  it("creates a project budget in the active workspace with exact strings and parsed thresholds", async () => {
    render(<MonthlyBudgets />);
    const projects = [...(screen.getByLabelText("Applies to") as HTMLSelectElement).options].map(o => o.text);
    expect(projects).toEqual(["All of Platform", "Project: Checkout"]);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " Checkout cloud " } });
    fireEvent.change(screen.getByLabelText("Applies to"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "EUR" } });
    fireEvent.change(screen.getByLabelText("Monthly amount"), { target: { value: "1250.5" } });
    fireEvent.change(screen.getByLabelText("Alert thresholds (%)"), { target: { value: "75,100" } });
    fireEvent.click(screen.getByRole("button", { name: "Create budget" }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ data: { workspaceId: 5, projectId: 3, name: "Checkout cloud", currency: "EUR", amount: "1250.5", thresholds: [75, 100] } }));
    expect(api.invalidate).toHaveBeenCalled();
  });

  it("creates Personal budgets without a workspace and offers only Personal projects", async () => {
    ws.value = { activeWorkspaceId: null, activeWorkspace: null, activeRole: null, canWrite: true };
    render(<MonthlyBudgets />);
    expect(api.statusCalls.at(-1)).toEqual({});
    expect([...(screen.getByLabelText("Applies to") as HTMLSelectElement).options].map(o => o.text)).toEqual(["All of Personal", "Project: Personal side project"]);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Me" } });
    fireEvent.change(screen.getByLabelText("Monthly amount"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Create budget" }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ data: { name: "Me", currency: "USD", amount: "10", thresholds: [50, 80, 100] } }));
  });

  it("shows the server's reason when a budget is rejected", async () => {
    api.create.mockRejectedValue({ status: 409, data: { message: "A USD budget already exists for this scope" } });
    render(<MonthlyBudgets />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Dup" } });
    fireEvent.change(screen.getByLabelText("Monthly amount"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Create budget" }));
    expect((await screen.findByRole("alert")).textContent).toContain("A USD budget already exists for this scope");
  });

  it("edits the amount and thresholds; currency and scope stay fixed", async () => {
    api.result = ok([status()]);
    render(<MonthlyBudgets />);
    fireEvent.click(screen.getByRole("button", { name: "Edit budget Cloud" }));
    const form = screen.getByRole("form", { name: "Edit budget Cloud" });
    expect(within(form).queryByLabelText("Currency")).toBeNull();
    fireEvent.change(within(form).getByLabelText("Amount (USD)"), { target: { value: "200" } });
    fireEvent.change(within(form).getByLabelText("Alert thresholds (%)"), { target: { value: "90" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith({ id: 1, data: { name: "Cloud", amount: "200", thresholds: [90] } }));
  });
});
