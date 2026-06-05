import { Router } from "express";
import { logger } from "../lib/logger";
import { z } from "zod";
import { db, expensesTable, platformsTable } from "@workspace/db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import PDFDocument from "pdfkit";

const router = Router();

const GenerateExportBody = z.object({
  module: z.string(),
  format: z.enum(["csv", "pdf"]),
  dateRange: z.string().optional(),
});

function sanitizeCsvField(val: string | null | undefined): string {
  if (!val) return "";
  const trimmed = val.trim();
  if (trimmed.length > 0 && ["=", "+", "-", "@"].includes(trimmed.charAt(0))) {
    return `'${trimmed}`;
  }
  return trimmed.replace(/"/g, '""');
}

// Generate Premium PDF/CSV Export
router.post("/generate", async (req, res) => {
  try {
    const { module, format, dateRange } = GenerateExportBody.parse(req.body);
    const userId = req.userId!;

    logger.info({ module, format, dateRange }, "Generating export");

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
      .leftJoin(platformsTable, eq(expensesTable.platformId, platformsTable.id))
      .where(eq(expensesTable.userId, userId))
      .orderBy(desc(expensesTable.date));

    if (format === "csv") {
      let csv = "ID,Date,Amount,Currency,Description,Category,Platform\n";
      for (const e of userExpenses) {
        const descSanitized = sanitizeCsvField(e.description);
        const catSanitized = sanitizeCsvField(e.category);
        const platformSanitized = sanitizeCsvField(e.platformName);
        csv += `${e.id},${e.date},${e.amount},${e.currency},"${descSanitized}","${catSanitized}","${platformSanitized}"\n`;
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${module}-export.csv`);
      res.status(200).send(csv);
      return;
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `${module}-report.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      doc.pipe(res);

      doc.fontSize(20).text("CostPilot - Export Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Module: ${module}`);
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
      if (dateRange) {
        doc.fontSize(12).text(`Date Range: ${dateRange}`);
      }
      doc.moveDown();

      doc.fontSize(14).text("Expenses", { underline: true });
      doc.moveDown(0.5);

      if (userExpenses.length === 0) {
        doc.fontSize(10).text("No expenses found.");
      } else {
        for (const e of userExpenses) {
          doc.fontSize(10).text(
            `${e.date} | ${e.platformName || "General"} | ${e.description || "N/A"} | $${Number(e.amount).toFixed(2)} ${e.currency || "USD"}`
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
