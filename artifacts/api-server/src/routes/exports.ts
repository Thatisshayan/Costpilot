import { csvCell } from "../lib/csv";
import { resourceScope } from "../lib/resource-scope";
import { Router } from "express";
import { logger } from "../lib/logger";
import { z } from "zod";
import { db, expensesTable, platformsTable, projectsTable, workspacesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { ExportFilters, searchFilters } from "../lib/expense-search";
import { filterConditions, fromCents, projectJoin, scopeCondition, toCents, vendorJoin } from "../lib/spend";
import { getWorkspaceMember } from "../middlewares/authz";
import PDFDocument from "pdfkit";

const router = Router();

// Upper bound on rows per export so one request cannot build an unbounded file in memory
// (Codacy: loop over user-controlled data). Larger ledgers export by narrowing the filters.
export const MAX_EXPORT_ROWS = 50_000;

// Mirrors OpenAPI GenerateExpenseExportBody; kept local because .strict() (unknown
// keys such as dateRange -> 400) is not emitted by the generated schema.
const GenerateExportBody = z.object({
  module: z.literal("expenses"),
  format: z.enum(["csv", "pdf"]),
  // Omitted/null exports personal records; a workspace id exports that workspace only.
  workspaceId: z.number().int().positive().nullable().optional(),
  // Same filters as GET /expenses/search, so an export matches what the list shows.
  filters: ExportFilters.optional(),
}).strict();

// Generate Premium PDF/CSV Export
router.post("/generate", async (req, res) => {
  try {
    const { module, format, workspaceId = null, filters = {} } = GenerateExportBody.parse(req.body);
    const userId = req.userId!;
    // Any active member (including viewers) may export a workspace they can read.
    if (workspaceId !== null && !(await getWorkspaceMember(workspaceId, userId))) {
      res.status(403).json({ error: "Workspace membership required" });
      return;
    }
    const workspaceName = workspaceId === null ? null
      : (await db.select({ name: workspacesTable.name }).from(workspacesTable).where(eq(workspacesTable.id, workspaceId)))[0]?.name ?? null;
    const scopeName = workspaceId === null ? "Personal" : workspaceName ?? `Workspace ${workspaceId}`;
    const scopeLabel = workspaceId === null ? "personal" : `workspace-${workspaceId}`;
    const stamp = new Date().toISOString().slice(0, 10);

    logger.info({ module, format }, "Generating export");

    const userExpenses = await db
      .select({
        id: expensesTable.id,
        date: expensesTable.date,
        amount: expensesTable.amount,
        currency: expensesTable.currency,
        description: expensesTable.description,
        category: expensesTable.category,
        platformName: platformsTable.name,
        projectName: projectsTable.name,
        source: expensesTable.source,
      })
      .from(expensesTable)
      .leftJoin(platformsTable, vendorJoin)
      .leftJoin(projectsTable, projectJoin)
      .where(and(resourceScope(expensesTable, userId), scopeCondition({ userId, workspaceId }), ...filterConditions(searchFilters(filters))))
      .orderBy(desc(expensesTable.date), desc(expensesTable.id))
      .limit(MAX_EXPORT_ROWS + 1);
    if (userExpenses.length > MAX_EXPORT_ROWS) {
      res.status(413).json({ error: "Payload Too Large", message: `Exports are limited to ${MAX_EXPORT_ROWS.toLocaleString("en-US")} expenses. Narrow the date range or filters and export again.` });
      return;
    }
    // Per-currency net totals in exact cents (same rule as the dashboard summary).
    const totals = new Map<string, bigint>();
    for (const e of userExpenses) totals.set(e.currency, (totals.get(e.currency) ?? 0n) + toCents(e.amount));

    if (format === "csv") {
      // Amount keeps its sign; Type states it explicitly so credits are never read as spending.
      // Amount is the exact stored 2-decimal value; Scope names the workspace for every row;
      // Source says whether the row was entered in the app or imported from a CSV file.
      let csv = "ID,Date,Type,Amount,Currency,Description,Category,Vendor,Project,Scope,Source\n";
      for (const e of userExpenses) {
        const amount = fromCents(toCents(e.amount));
        csv += [e.id, e.date, amount.startsWith("-") ? "Refund/credit" : "Expense", amount, e.currency, e.description, e.category, e.platformName, e.projectName, scopeName, e.source === "import" ? "CSV import" : "Manual"].map(csvCell).join(",") + "\n";
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="costpilot-${module}-${scopeLabel}-${stamp}.csv"`);
      res.status(200).send(csv);
      return;
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `costpilot-${module}-${scopeLabel}-${stamp}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      doc.pipe(res);

      doc.fontSize(20).text("CostPilot - Export Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Module: ${module}`);
      doc.fontSize(12).text(`Scope: ${scopeName}`);
      if (filters.from || filters.to) doc.fontSize(12).text(`Dates: ${filters.from ?? "start"} to ${filters.to ?? "latest"}`);
      doc.fontSize(10).text("Recorded amounts as entered, per row. Currencies are not converted or totalled.");
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      doc.fontSize(14).text("Expenses", { underline: true });
      doc.moveDown(0.5);

      if (userExpenses.length === 0) {
        doc.fontSize(10).text("No expenses found.");
      } else {
        for (const e of userExpenses) {
          const amount = fromCents(toCents(e.amount));
          doc.fontSize(10).text(
            `${e.date} | ${e.platformName || "No vendor"} | ${e.projectName || "No project"} | ${e.description || "-"} | ${amount} ${e.currency}${amount.startsWith("-") ? " (refund/credit)" : ""}`
          );
        }
        doc.moveDown();
        doc.fontSize(12).text("Net totals by currency (not converted)", { underline: true });
        for (const [currency, cents] of [...totals].sort(([a], [b]) => a.localeCompare(b))) {
          doc.fontSize(10).text(`${currency}: ${fromCents(cents)}`);
        }
      }

      doc.end();
      return;
    }

    res.status(400).json({ success: false, message: "Unsupported format" });
  } catch (err) {
    logger.error({ err }, "Export generation failed");
    throw err;
  }
});

export default router;
