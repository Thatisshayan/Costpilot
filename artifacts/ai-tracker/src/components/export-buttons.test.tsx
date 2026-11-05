// The real ExportButtons must forward the list's filters, or an export silently covers the whole scope.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@workspace/api-client-react/custom-fetch", () => ({ authenticatedFetch: fetchMock }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ExportButtons } from "./export-buttons";

afterEach(() => { cleanup(); fetchMock.mockReset(); });

describe("ExportButtons", () => {
  it("sends the scope and the exact filters in the export request", async () => {
    fetchMock.mockResolvedValue(new Response("ID,Date\n", { status: 200, headers: {
      "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="costpilot-expenses.csv"',
    } }));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const filters = { from: "2026-09-01", to: "2026-09-30", platformId: "12", category: "" };
    render(<ExportButtons workspaceId={5} filters={filters} />);
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ module: "expenses", format: "csv", workspaceId: 5, filters });
  });

  it("cannot export while disabled", () => {
    render(<ExportButtons workspaceId={5} filters={{ minAmount: "abc" }} disabled />);
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect((screen.getByRole("button", { name: "Export PDF" }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
