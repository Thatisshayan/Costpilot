import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { SpendCurrency, SpendSummary } from "@workspace/api-client-react";

const ws = vi.hoisted(() => ({ value: { activeWorkspaceId: 7 as number | null, activeWorkspace: { id: 7, name: "Platform" } as { id: number; name: string } | null, canWrite: true } }));
const summaryHook = vi.hoisted(() => ({ calls: [] as unknown[], result: {} as Record<string, unknown> }));
const budgetHook = vi.hoisted(() => ({ calls: [] as unknown[], budgets: [] as unknown[] }));
vi.mock("@/context/workspace-context", () => ({ useWorkspace: () => ws.value }));
vi.mock("@workspace/api-client-react", () => ({
  useGetSpendSummary: (params: unknown) => { summaryHook.calls.push(params); return summaryHook.result; },
  useGetBudgetStatus: (params: unknown) => { budgetHook.calls.push(params); return { data: { budgets: budgetHook.budgets } }; },
}));

import Dashboard, { comparisonText, recentMonths } from "../dashboard";

const currency = (overrides: Partial<SpendCurrency>): SpendCurrency => ({
  currency: "USD", net: "80.30", charges: "100.30", credits: "-20.00", count: 3, previousNet: "80.00",
  changeAmount: "0.30", changePercent: 0.4, byVendor: [], byProject: [], byCategory: [],
  trend: [{ month: "2026-08", net: "80.00" }, { month: "2026-09", net: "80.30" }], ...overrides,
});
const summary = (currencies: SpendCurrency[], partial = false): SpendSummary => ({
  workspaceId: 7,
  period: { month: "2026-09", start: "2026-09-01", end: "2026-09-30", through: partial ? "2026-09-05" : "2026-09-30", isPartial: partial },
  comparison: { month: "2026-08", start: "2026-08-01", through: partial ? "2026-08-05" : "2026-08-31", basis: partial ? "same-days" : "full-month" },
  currencies,
});
const ok = (data: SpendSummary) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });

beforeEach(() => { budgetHook.calls = []; budgetHook.budgets = []; summaryHook.calls = []; ws.value = { activeWorkspaceId: 7, activeWorkspace: { id: 7, name: "Platform" }, canWrite: true }; });
afterEach(cleanup);

describe("monthly dashboard", () => {
  it("asks the server for the selected scope and month instead of downloading the ledger", () => {
    summaryHook.result = ok(summary([]));
    render(<Dashboard />);
    const current = recentMonths(new Date().toISOString().slice(0, 10))[0];
    expect(summaryHook.calls.at(-1)).toEqual({ month: current, workspaceId: 7 });
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: recentMonths(new Date().toISOString())[2] } });
    expect((summaryHook.calls.at(-1) as { month: string }).month).toBe(recentMonths(new Date().toISOString())[2]);
  });

  it("omits workspaceId in Personal scope", () => {
    ws.value = { activeWorkspaceId: null, activeWorkspace: null, canWrite: true };
    summaryHook.result = ok(summary([]));
    render(<Dashboard />);
    expect(summaryHook.calls.at(-1)).not.toHaveProperty("workspaceId");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Personal spending");
  });

  it("shows one card per currency and never combines them; JPY has no decimals", () => {
    summaryHook.result = ok(summary([
      currency({ currency: "EUR", net: "50.00", charges: "50.00", credits: "0.00", previousNet: "0.00", changeAmount: "50.00", changePercent: null, count: 1 }),
      currency({ currency: "JPY", net: "1500.00", charges: "1500.00", credits: "0.00", previousNet: "1000.00", changeAmount: "500.00", changePercent: 50, count: 1 }),
      currency({}),
    ]));
    render(<Dashboard />);
    const cards = within(screen.getByRole("region", { name: "Totals by currency" }));
    expect(cards.getByRole("region", { name: "JPY totals" }).textContent).toContain("¥1,500");
    expect(cards.getByRole("region", { name: "JPY totals" }).textContent).not.toContain("1,500.00");
    expect(cards.getByRole("region", { name: "USD totals" }).textContent).toContain("$80.30");
    expect(cards.getByRole("region", { name: "USD totals" }).textContent).toContain("-$20.00");
    expect(screen.queryByText(/total.*all currencies/i)).toBeNull();
  });

  it("explains a missing percentage instead of showing one against a zero baseline", () => {
    summaryHook.result = ok(summary([currency({ currency: "EUR", net: "50.00", previousNet: "0.00", changeAmount: "50.00", changePercent: null })]));
    render(<Dashboard />);
    const card = screen.getByRole("region", { name: "EUR totals" });
    expect(card.textContent).toContain("+€50.00");
    expect(card.textContent).not.toMatch(/%\)/);
    expect(card.textContent).toMatch(/no percentage: no spend in the comparison period/);
  });

  it("states the comparison method, including same-days for a partial month", () => {
    expect(comparisonText(summary([], true))).toMatch(/Sep 1.*Sep 5 compared with Aug 1.*Aug 5/);
    expect(comparisonText(summary([], false))).toMatch(/September 2026 compared with August 2026/);
    summaryHook.result = ok(summary([currency({})], true));
    render(<Dashboard />);
    expect(screen.getByText(/Comparing the same days avoids/)).toBeTruthy();
  });

  it("switches breakdowns by currency and links each row to the matching filtered expenses", () => {
    summaryHook.result = ok(summary([
      currency({ currency: "EUR", byVendor: [{ id: 9, name: "OpenAI", net: "50.00", count: 1 }] }),
      currency({ byVendor: [{ id: 3, name: "AWS", net: "80.30", count: 3 }], byProject: [{ id: null, name: null, net: "-19.80", count: 2 }] }),
    ]));
    render(<Dashboard />);
    fireEvent.click(screen.getByRole("button", { name: "USD" }));
    expect(screen.getByRole("button", { name: "USD" }).getAttribute("aria-pressed")).toBe("true");
    const vendors = screen.getByRole("region", { name: "By vendor (USD)" });
    expect(within(vendors).getByRole("link", { name: "AWS" }).getAttribute("href"))
      .toBe("/expenses?from=2026-09-01&to=2026-09-30&currency=USD&platformId=3");
    const projects = screen.getByRole("region", { name: "By project (USD)" });
    expect(within(projects).getByRole("link", { name: "No project" }).getAttribute("href")).toContain("projectId=none");
  });

  it("has distinct empty, loading and error states", () => {
    summaryHook.result = ok(summary([]));
    const view = render(<Dashboard />);
    expect(screen.getByText(/No expenses recorded for/)).toBeTruthy();
    summaryHook.result = { data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() };
    view.rerender(<Dashboard />);
    expect(screen.getByRole("status")).toBeTruthy();
    const refetch = vi.fn();
    summaryHook.result = { data: undefined, isLoading: false, isError: true, error: { status: 403, data: { message: "Workspace membership required" } }, refetch };
    view.rerender(<Dashboard />);
    expect(screen.getByRole("alert").textContent).toContain("Workspace membership required");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("hides the add action from read-only roles", () => {
    ws.value = { ...ws.value, canWrite: false };
    summaryHook.result = ok(summary([]));
    render(<Dashboard />);
    expect(screen.queryByRole("link", { name: "Add an expense" })).toBeNull();
  });
});

describe("budget alerts on the dashboard", () => {
  const status = (state: string, extra: Record<string, unknown>) => ({
    budget: { id: Math.random(), name: "Cloud", projectName: null, currency: "USD", amount: "100.00", thresholds: [50, 80, 100] },
    net: "80.30", charges: "100.30", credits: "-20.00", count: 3, remaining: "19.70", percentUsed: 80.3, thresholdReached: 80, state, ...extra,
  });

  it("shows nothing when every budget is within its thresholds", () => {
    summaryHook.result = ok(summary([]));
    budgetHook.budgets = [status("ok", { thresholdReached: null, percentUsed: 10 })];
    render(<Dashboard />);
    expect(screen.queryByRole("region", { name: "Budget alerts" })).toBeNull();
    expect(budgetHook.calls.at(-1)).toEqual({ workspaceId: 7 });
  });

  it("lists reached thresholds and over-budget amounts in each budget's own currency", () => {
    summaryHook.result = ok(summary([]));
    budgetHook.budgets = [
      status("alert", {}),
      status("over", { budget: { id: 2, name: "AI", projectName: "Checkout", currency: "JPY", amount: "1000.00", thresholds: [100] }, remaining: "-500.00", percentUsed: 150, thresholdReached: 100 }),
    ];
    render(<Dashboard />);
    const alerts = screen.getByRole("region", { name: "Budget alerts" });
    expect(alerts.textContent).toContain("2 budgets need attention");
    expect(alerts.textContent).toContain("Cloud (whole scope, USD): 80.3% used — the 80% threshold is reached.");
    expect(alerts.textContent).toContain("AI (Checkout, JPY): over budget by ¥500 — 150% used.");
    expect(within(alerts).getByRole("link", { name: "Review budgets" }).getAttribute("href")).toBe("/budgets");
  });
});

describe("month list", () => {
  it("lists twelve months newest first across a year boundary", () => {
    const months = recentMonths("2026-02-10");
    expect(months.slice(0, 3)).toEqual(["2026-02", "2026-01", "2025-12"]);
    expect(months).toHaveLength(12);
  });
});
