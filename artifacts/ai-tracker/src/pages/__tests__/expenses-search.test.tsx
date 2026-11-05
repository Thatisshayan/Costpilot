// Batch 2 expense discovery: server-side search parameters, URL state, paging,
// per-currency totals, currency formatting, phone layout and filtered exports.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const ws = vi.hoisted(() => ({
  value: { activeWorkspaceId: 5 as number | null, activeRole: "owner" as string | null, canWrite: true, canManage: true },
}));
type Call = { params: Record<string, unknown>; enabled: unknown };
const api = vi.hoisted(() => ({
  calls: [] as Call[],
  result: { data: undefined as unknown, isLoading: false, isError: false, error: null as unknown, refetch: vi.fn() },
  exportFilters: [] as unknown[],
}));

vi.mock("@/context/workspace-context", () => ({ useWorkspace: () => ws.value }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn(async () => undefined) }) }));
vi.mock("@/components/export-buttons", () => ({
  ExportButtons: (props: { filters?: unknown }) => { api.exportFilters.push(props.filters); return <span>export</span>; },
}));
vi.mock("@workspace/api-client-react", () => {
  const mutation = () => () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    useSearchExpenses: (params: Record<string, unknown>, options: { query?: { enabled?: unknown } }) => {
      api.calls.push({ params, enabled: options?.query?.enabled });
      return api.result;
    },
    useListPlatforms: () => ({ data: [{ id: 12, workspaceId: 5, name: "AWS" }, { id: 99, workspaceId: 7, name: "Other scope" }] }),
    useListProjects: () => ({ data: [{ id: 3, workspaceId: 5, name: "Checkout" }] }),
    useCreateExpense: mutation(),
    useUpdateExpense: mutation(),
    useDeleteExpense: mutation(),
    getSearchExpensesQueryKey: () => ["/api/expenses/search"],
    getListExpensesQueryKey: () => ["/api/expenses"],
    getGetSpendSummaryQueryKey: () => ["/api/spend/summary"],
  };
});

import Expenses from "../expenses";

const item = (id: number, amount: number, currency: string, extra: Record<string, unknown> = {}) =>
  ({ id, workspaceId: 5, amount, currency, date: "2026-09-10", createdAt: "2026-09-10T00:00:00Z", platformName: "AWS", projectName: "Checkout", ...extra });
const page = (items: unknown[], total = items.length, totals: unknown[] = []) => ({ items, total, limit: 25, offset: 0, totals });
const lastCall = () => api.calls[api.calls.length - 1];
const search = () => new URLSearchParams(window.location.search);

beforeEach(() => {
  api.calls = [];
  api.exportFilters = [];
  ws.value = { activeWorkspaceId: 5, activeRole: "owner", canWrite: true, canManage: true };
  api.result = { data: page([item(1, 12.5, "USD")], 1, [{ currency: "USD", net: "12.50", count: 1 }]), isLoading: false, isError: false, error: null, refetch: vi.fn() };
  window.history.replaceState(null, "", "/expenses");
});
afterEach(cleanup);

describe("server-side search parameters", () => {
  it("honours dashboard deep links and sends them as API parameters for the active workspace", () => {
    window.history.replaceState(null, "", "/expenses?from=2026-09-01&to=2026-09-30&platformId=12&projectId=none&sort=amount_desc&page=2");
    api.result = { ...api.result, data: { ...page([item(26, 1, "USD")], 26), offset: 25 } };
    render(<Expenses />);
    expect(lastCall().params).toEqual({
      workspaceId: 5, from: "2026-09-01", to: "2026-09-30", platformId: "12", projectId: "none",
      sort: "amount_desc", limit: 25, offset: 25,
    });
    expect(lastCall().enabled).toBe(true);
    expect((screen.getByLabelText("Vendor") as HTMLSelectElement).value).toBe("12");
    expect((screen.getByLabelText("Project") as HTMLSelectElement).value).toBe("none");
  });

  it("omits workspaceId in Personal scope and lists only that scope's vendors", () => {
    ws.value = { ...ws.value, activeWorkspaceId: null };
    render(<Expenses />);
    expect(lastCall().params).not.toHaveProperty("workspaceId");
    const vendor = screen.getByLabelText("Vendor") as HTMLSelectElement;
    expect([...vendor.options].map(o => o.text)).toEqual(["All vendors", "No vendor"]);
  });

  it("writes filter changes to the URL with API names and resets to page 1", async () => {
    window.history.replaceState(null, "", "/expenses?page=3");
    render(<Expenses />);
    fireEvent.change(screen.getByLabelText("Vendor"), { target: { value: "none" } });
    await waitFor(() => expect(search().get("platformId")).toBe("none"));
    expect(search().get("page")).toBeNull();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "__none" } });
    await waitFor(() => expect(search().get("category")).toBe(""));
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "credit" } });
    await waitFor(() => expect(search().get("entryType")).toBe("credit"));
    expect(lastCall().params).toMatchObject({ platformId: "none", category: "", entryType: "credit", offset: 0 });
  });

  it("debounces the search text before updating the URL", async () => {
    render(<Expenses />);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "  openai " } });
    expect(search().get("q")).toBeNull();
    await waitFor(() => expect(search().get("q")).toBe("openai"), { timeout: 2000 });
  });

  it("validates dates and amounts without calling the API", () => {
    window.history.replaceState(null, "", "/expenses?from=2026-09-30&to=2026-09-01&minAmount=1.234");
    render(<Expenses />);
    expect(lastCall().enabled).toBe(false);
    expect(screen.getByLabelText("From date").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("The start date must be on or before the end date.")).toBeTruthy();
    expect(screen.getByLabelText("Minimum amount").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toMatch(/fix the highlighted filters/i);
  });

  it("clears every filter at once", async () => {
    window.history.replaceState(null, "", "/expenses?q=aws&currency=USD");
    render(<Expenses />);
    fireEvent.click(screen.getAllByRole("button", { name: /clear filters/i })[0]);
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("resets filters when the workspace scope changes", async () => {
    window.history.replaceState(null, "", "/expenses?currency=USD");
    const view = render(<Expenses />);
    ws.value = { ...ws.value, activeWorkspaceId: 8 };
    view.rerender(<Expenses />);
    await waitFor(() => expect(window.location.search).toBe(""));
  });
});

describe("pagination", () => {
  it("labels the range and disables Previous on the first page", async () => {
    api.result = { ...api.result, data: page(Array.from({ length: 25 }, (_, i) => item(i + 1, 1, "USD")), 60) };
    render(<Expenses />);
    expect(screen.getByText("Showing 1–25 of 60")).toBeTruthy();
    const prev = screen.getByRole("button", { name: "Previous page of expenses" }) as HTMLButtonElement;
    const next = screen.getByRole("button", { name: "Next page of expenses" }) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    fireEvent.click(next);
    await waitFor(() => expect(search().get("page")).toBe("2"));
    expect(lastCall().params).toMatchObject({ offset: 25, limit: 25 });
  });

  it("moves a page beyond the end back to the last page", async () => {
    window.history.replaceState(null, "", "/expenses?page=9");
    api.result = { ...api.result, data: page([item(1, 1, "USD")], 30) };
    render(<Expenses />);
    await waitFor(() => expect(search().get("page")).toBe("2"));
  });

  it("disables Next on the last page", () => {
    window.history.replaceState(null, "", "/expenses?page=3");
    api.result = { ...api.result, data: { ...page(Array.from({ length: 10 }, (_, i) => item(i + 51, 1, "USD")), 60), offset: 50 } };
    render(<Expenses />);
    expect(screen.getByText("Showing 51–60 of 60")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Next page of expenses" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("money display", () => {
  it("shows per-currency totals over all matches without combining currencies", () => {
    api.result = { ...api.result, data: page([item(1, 80.3, "USD"), item(2, 1500, "JPY")], 2, [
      { currency: "JPY", net: "1500.00", count: 1 }, { currency: "USD", net: "80.30", count: 1 },
    ]) };
    render(<Expenses />);
    const totals = screen.getByRole("group", { name: "Totals for all matching expenses" });
    expect(within(totals).getByText(/Net of refunds\/credits, all matching expenses/)).toBeTruthy();
    const entries = within(totals).getAllByRole("listitem").map(li => li.textContent);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toContain("¥1,500");
    expect(entries[1]).toContain("$80.30");
  });

  it("formats rows in their own currency (no decimals for JPY) and labels refunds", () => {
    api.result = { ...api.result, data: page([item(1, 1500, "JPY"), item(2, -20, "USD", { description: "Support credit" })], 2) };
    render(<Expenses />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("¥1,500")).toBeTruthy();
    expect(within(table).queryByText(/1,500\.00/)).toBeNull();
    expect(within(table).getByText("-$20.00")).toBeTruthy();
    expect(within(table).getByText("Refund/credit")).toBeTruthy();
  });

  it("renders a stacked list for phones alongside the table", () => {
    api.result = { ...api.result, data: page([item(1, 12.5, "USD"), item(2, 7, "EUR")], 2) };
    render(<Expenses />);
    const list = screen.getByRole("list", { name: "Expenses" });
    expect(list.className).toMatch(/sm:hidden/);
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("€7.00")).toBeTruthy();
    expect(screen.getByRole("table").parentElement!.className).toMatch(/hidden sm:block/);
  });
});

describe("empty states and exports", () => {
  it("distinguishes 'no matches' (with Clear filters) from an empty scope", async () => {
    window.history.replaceState(null, "", "/expenses?q=zzz");
    api.result = { ...api.result, data: page([], 0) };
    const view = render(<Expenses />);
    expect(screen.getByText("No expenses match these filters.")).toBeTruthy();
    view.unmount();
    window.history.replaceState(null, "", "/expenses");
    render(<Expenses />);
    expect(screen.getByText("No expenses yet in this scope.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /add your first expense/i })).toBeTruthy();
  });

  it("exports with exactly the active filters (no paging or sorting)", () => {
    window.history.replaceState(null, "", "/expenses?from=2026-09-01&to=2026-09-30&platformId=12&sort=amount_asc&page=2");
    render(<Expenses />);
    expect(api.exportFilters[api.exportFilters.length - 1]).toEqual({ from: "2026-09-01", to: "2026-09-30", platformId: "12" });
  });

  it("exports without filters when none are active", () => {
    render(<Expenses />);
    expect(api.exportFilters[api.exportFilters.length - 1]).toBeUndefined();
  });

  it("shows loading and error states", () => {
    api.result = { ...api.result, data: undefined, isLoading: true };
    const view = render(<Expenses />);
    expect(screen.getByRole("status").textContent).toMatch(/loading expenses/i);
    view.unmount();
    api.result = { ...api.result, data: undefined, isLoading: false, isError: true, error: { status: 500 } };
    render(<Expenses />);
    expect(screen.getByRole("alert").textContent).toMatch(/could not be loaded/i);
    act(() => { fireEvent.click(screen.getByRole("button", { name: "Try again" })); });
    expect(api.result.refetch).toHaveBeenCalled();
  });
});
