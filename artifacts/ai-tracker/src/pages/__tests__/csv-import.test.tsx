// Batch 3B CSV import page: file limits, mapping, server row report, confirmations, undo, roles.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const ws = vi.hoisted(() => ({
  value: { activeWorkspaceId: 5 as number | null, activeWorkspace: { id: 5, name: "Platform" } as { id: number; name: string } | null, activeRole: "owner" as string | null, canWrite: true },
}));
const api = vi.hoisted(() => ({
  preview: vi.fn(), create: vi.fn(), undo: vi.fn(), invalidate: vi.fn(async () => undefined),
  batches: [] as unknown[], listCalls: [] as unknown[],
}));
vi.mock("@/context/workspace-context", () => ({ useWorkspace: () => ws.value }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: api.invalidate }) }));
vi.mock("@workspace/api-client-react", () => ({
  usePreviewImport: () => ({ mutateAsync: api.preview, isPending: false }),
  useCreateImport: () => ({ mutateAsync: api.create, isPending: false }),
  useUndoImport: () => ({ mutateAsync: api.undo, isPending: false }),
  useListImports: (params: unknown) => { api.listCalls.push(params); return { data: api.batches, isError: false }; },
  getListImportsQueryKey: () => ["/api/imports"],
}));

import CsvImport from "../csv-import";

const csv = "Transaction ID,Date,Amount,Currency,Vendor\ninv-1,2026-09-03,10.00,USD,AWS\ninv-2,2026-09-04,-2.50,USD,AWS\ninv-3,2026-09-05,abc,USD,AWS\n";
const upload = (content = csv, name = "sept.csv") => {
  const file = new File([content], name, { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [file] } });
};
const report = {
  rows: [
    { rowNumber: 2, status: "valid", messages: [] },
    { rowNumber: 3, status: "possible_duplicate", messages: ["An expense with the same date, amount, currency, vendor, project and description already exists."] },
    { rowNumber: 4, status: "invalid", messages: ["Amount must be a number with at most 2 decimals, such as 12.50 or -4.00 for a refund."] },
  ],
  counts: { valid: 1, invalid: 1, already_imported: 0, possible_duplicate: 1 },
  importableCount: 1,
};

beforeEach(() => {
  ws.value = { activeWorkspaceId: 5, activeWorkspace: { id: 5, name: "Platform" }, activeRole: "owner", canWrite: true };
  api.preview.mockReset().mockResolvedValue(report);
  api.create.mockReset().mockResolvedValue({ batch: { id: 1 }, insertedCount: 2, skippedCount: 1, rows: [], counts: report.counts });
  api.undo.mockReset().mockResolvedValue({ deletedCount: 2 });
  api.invalidate.mockClear();
  api.batches = [];
  api.listCalls = [];
});
afterEach(cleanup);

describe("file checks", () => {
  it("rejects non-CSV files and files over 1 MB before sending anything", async () => {
    render(<CsvImport />);
    upload("x", "sheet.xlsx");
    expect(await screen.findByText("Choose a .csv file.")).toBeTruthy();
    upload("a".repeat(1024 * 1024 + 1));
    expect(await screen.findByText(/larger than 1 MB/)).toBeTruthy();
    expect(api.preview).not.toHaveBeenCalled();
  });

  it("rejects more than 500 rows", async () => {
    render(<CsvImport />);
    upload("Date,Amount\n" + "2026-09-01,1\n".repeat(501));
    expect(await screen.findByText(/501 rows; import at most 500/)).toBeTruthy();
  });
});

describe("mapping, report and import", () => {
  it("maps columns, sends exact text rows for the active workspace and shows the row report", async () => {
    render(<CsvImport />);
    upload();
    expect(((await screen.findByLabelText("Amount (required)")) as HTMLSelectElement).value).toBe("Amount");
    fireEvent.click(screen.getByRole("button", { name: "Check rows" }));
    await waitFor(() => expect(api.preview).toHaveBeenCalled());
    expect(api.preview.mock.calls[0][0]).toEqual({ data: { workspaceId: 5, fileName: "sept.csv", rows: [
      { rowNumber: 2, date: "2026-09-03", amount: "10.00", currency: "USD", vendor: "AWS", externalId: "inv-1" },
      { rowNumber: 3, date: "2026-09-04", amount: "-2.50", currency: "USD", vendor: "AWS", externalId: "inv-2" },
      { rowNumber: 4, date: "2026-09-05", amount: "abc", currency: "USD", vendor: "AWS", externalId: "inv-3" },
    ] } });
    const counts = await screen.findByRole("list", { name: "Row counts" });
    expect(counts.textContent).toContain("1 ready");
    expect(counts.textContent).toContain("1 with errors (skipped)");
    expect(screen.getByText(/Line 4: Error/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import 1 row into Platform" })).toBeTruthy();
  });

  it("imports a possible duplicate only when the user confirms it", async () => {
    render(<CsvImport />);
    upload();
    await screen.findByLabelText("Amount (required)");
    fireEvent.click(screen.getByRole("button", { name: "Check rows" }));
    fireEvent.click(await screen.findByLabelText(/Import line 3 anyway/));
    fireEvent.click(screen.getByRole("button", { name: "Import 2 rows into Platform" }));
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    expect(api.create.mock.calls[0][0].data.confirmDuplicateRows).toEqual([3]);
    expect(api.invalidate).toHaveBeenCalled();
  });

  it("asks for one currency when the file has no currency column", async () => {
    render(<CsvImport />);
    upload("Date,Amount\n2026-09-01,1.00\n");
    await screen.findByLabelText("Amount (required)");
    expect((screen.getByRole("button", { name: "Check rows" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Currency of every row"), { target: { value: "EUR" } });
    fireEvent.click(screen.getByRole("button", { name: "Check rows" }));
    await waitFor(() => expect(api.preview.mock.calls[0][0].data.rows[0].currency).toBe("EUR"));
  });

  it("imports into Personal when no workspace is active", async () => {
    ws.value = { activeWorkspaceId: null, activeWorkspace: null, activeRole: null, canWrite: true };
    render(<CsvImport />);
    expect(screen.getByText("Personal", { selector: "strong" })).toBeTruthy();
    upload();
    await screen.findByLabelText("Amount (required)");
    fireEvent.click(screen.getByRole("button", { name: "Check rows" }));
    await waitFor(() => expect(api.preview.mock.calls[0][0].data).not.toHaveProperty("workspaceId"));
  });

  it("shows the server's message when the check fails", async () => {
    api.preview.mockRejectedValue({ status: 403, data: { message: "Workspace owner or admin role required to import" } });
    render(<CsvImport />);
    upload();
    await screen.findByLabelText("Amount (required)");
    fireEvent.click(screen.getByRole("button", { name: "Check rows" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Workspace owner or admin role required to import");
  });
});

describe("roles and undo", () => {
  it("hides the upload from viewers but lists imports without undo", () => {
    ws.value = { ...ws.value, activeRole: "viewer", canWrite: false };
    api.batches = [{ id: 7, workspaceId: 5, fileName: "aug.csv", rowCount: 3, insertedCount: 2, skippedCount: 1, createdAt: "2026-09-01T00:00:00Z", undoneAt: null }];
    render(<CsvImport />);
    expect(screen.queryByLabelText("CSV file")).toBeNull();
    expect(screen.getByText(/viewer role cannot import/)).toBeTruthy();
    expect(screen.getByText("aug.csv")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /undo import/i })).toBeNull();
  });

  it("undoes an import after confirmation", async () => {
    api.batches = [{ id: 7, workspaceId: 5, fileName: "aug.csv", rowCount: 3, insertedCount: 2, skippedCount: 1, createdAt: "2026-09-01T00:00:00Z", undoneAt: null }];
    render(<CsvImport />);
    expect(api.listCalls.at(-1)).toEqual({ workspaceId: 5 });
    fireEvent.click(screen.getByRole("button", { name: "Undo import aug.csv" }));
    expect(api.undo).not.toHaveBeenCalled();
    const history = screen.getByRole("region", { name: "Recent imports" });
    fireEvent.click(within(history).getByRole("button", { name: "Undo import" }));
    await waitFor(() => expect(api.undo).toHaveBeenCalledWith({ id: 7 }));
  });
});
