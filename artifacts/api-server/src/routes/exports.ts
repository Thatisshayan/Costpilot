import { csvCell } from "../lib/csv";
import { resourceScope } from "../lib/resource-scope";
import { Router } from "express";
import { logger } from "../lib/logger";
import { z } from "zod";
import { db, expensesTable, platformsTable } from "@workspace/db";
import { eq, desc, sql, and, isNull } from "drizzle-orm";
import { getWorkspaceMember } from "../middlewares/authz";
import PDFDocument from "pdfkit";

const router = Router();

// Mirrors OpenAPI GenerateExpenseExportBody; kept local because .strict() (unknown
// keys such as dateRange -> 400) is not emitted by the generated schema.
const GenerateExportBody = z.object({
  module: z.literal("expenses"),
  format: z.enum(["csv", "pdf"]),
  // Omitted/null exports personal records; a workspace id exports that workspace only.
  workspaceId: z.number().int().positive().nullable().optional(),
}).strict();

// Generate Premium PDF/CSV Export
router.post("/generate", async (req, res) => {
  try {
    const { module, format, workspaceId = null } = GenerateExportBody.parse(req.body);
    const userId = req.userId!;
    // Any active member (including viewers) may export a workspace they can read.
    if (workspaceId !== null && !(await getWorkspaceMember(workspaceId, userId))) {
      res.status(403).json({ error: "Workspace membership required" });
      return;
    }
    const scopeFilter = workspaceId === null
      ? and(isNull(expensesTable.workspaceId), eq(expensesTable.userId, userId))
      : eq(expensesTable.workspaceId, workspaceId);
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
      })
      .from(expensesTable)
      .leftJoin(platformsTable, and(eq(expensesTable.platformId, platformsTable.id), sql`((${expensesTable.workspaceId} IS NULL AND ${platformsTable.workspaceId} IS NULL AND ${expensesTable.userId} = ${platformsTable.userId}) OR ${expensesTable.workspaceId} = ${platformsTable.workspaceId})`))
      .where(and(resourceScope(expensesTable, userId), scopeFilter))
      .orderBy(desc(expensesTable.date));

    if (format === "csv") {
      // Amount keeps its sign; Type states it explicitly so credits are never read as spending.
      let csv = "ID,Date,Type,Amount,Currency,Description,Category,Platform\n";
      for (const e of userExpenses) {
        const amount = Number(e.amount);
        csv += [e.id, e.date, amount < 0 ? "Refund/credit" : "Expense", amount, e.currency, e.description, e.category, e.platformName].map(csvCell).join(",") + "\n";
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
      doc.fontSize(12).text(`Scope: ${workspaceId === null ? "Personal" : `Workspace ${workspaceId}`}`);
      doc.fontSize(10).text("Recorded amounts as entered, per row. Currencies are not converted or totalled.");
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      doc.fontSize(14).text("Expenses", { underline: true });
      doc.moveDown(0.5);

      if (userExpenses.length === 0) {
        doc.fontSize(10).text("No expenses found.");
      } else {
        for (const e of userExpenses) {
          doc.fontSize(10).text(
            `${e.date} | ${e.platformName || "General"} | ${e.description || "N/A"} | ${Number(e.amount).toFixed(2)} ${e.currency || "USD"}${Number(e.amount) < 0 ? " (refund/credit)" : ""}`
          );
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
