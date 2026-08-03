import { Router } from "express";
import { db, expensesTable, platformsTable, projectsTable } from "@workspace/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

export function sanitizeCsvField(val: string | null | undefined): string {
  if (!val) return "";
  const trimmed = val.trim();
  if (trimmed.length > 0 && ["=", "+", "-", "@"].includes(trimmed.charAt(0))) {
    return `'${trimmed}`;
  }
  return trimmed.replace(/"/g, '""'); // Escape double quotes
}

const scheduledReports: Map<string, { workspaceId: number; userId: string; format: string; frequency: string; recipients: string[] }> = new Map();

router.get("/templates", requireAuth, async (req, res) => {
  res.json([
    {
      id: "monthly-spend",
      name: "Monthly Spend Report",
      description: "Complete breakdown of all AI spending by provider, project, and category for the month.",
      formats: ["csv", "pdf"],
    },
    {
      id: "provider-comparison",
      name: "Provider Cost Comparison",
      description: "Side-by-side cost comparison across all AI providers with usage metrics.",
      formats: ["csv", "pdf"],
    },
    {
      id: "anomaly-summary",
      name: "Anomaly Detection Summary",
      description: "All detected cost anomalies, severity levels, and remediation actions taken.",
      formats: ["pdf"],
    },
    {
      id: "budget-utilization",
      name: "Budget Utilization Report",
      description: "Budget vs. actual spend across all projects and categories.",
      formats: ["csv", "pdf"],
    },
    {
      id: "executive-summary",
      name: "Executive Summary",
      description: "High-level KPIs, trends, and savings opportunities for leadership.",
      formats: ["pdf"],
    },
  ]);
});

router.post("/generate", requireAuth, async (req, res) => {
  const schema = z.object({
    templateId: z.string(),
    format: z.enum(["csv", "pdf"]),
    dateRange: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
  });

  const { templateId, format, dateRange } = schema.parse(req.body);
  const userId = req.userId!;

  const conditions: any[] = [eq(expensesTable.userId, userId)];
  if (dateRange?.start) {
    conditions.push(gte(expensesTable.date, dateRange.start));
  }
  if (dateRange?.end) {
    conditions.push(lte(expensesTable.date, dateRange.end));
  }

  const expenses = await db.select({
    id: expensesTable.id,
    date: expensesTable.date,
    amount: expensesTable.amount,
    currency: expensesTable.currency,
    description: expensesTable.description,
    category: expensesTable.category,
    platformName: platformsTable.name,
    projectName: projectsTable.name,
  })
  .from(expensesTable)
  .leftJoin(platformsTable, eq(expensesTable.platformId, platformsTable.id))
  .leftJoin(projectsTable, eq(expensesTable.projectId, projectsTable.id))
  .where(and(...conditions))
  .orderBy(desc(expensesTable.date));

  if (format === "csv") {
    let csv = "Date,Platform,Project,Description,Category,Amount,Currency\n";
    for (const e of expenses) {
      const desc = sanitizeCsvField(e.description);
      const platform = sanitizeCsvField(e.platformName);
      const project = sanitizeCsvField(e.projectName);
      const category = sanitizeCsvField(e.category);
      const currency = sanitizeCsvField(e.currency);
      csv += `${e.date},${platform},${project},"${desc}",${category},${e.amount},${currency}\n`;
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(templateId)}-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  }

  const { default: PDFDocument } = await import("pdfkit");
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(templateId)}-${Date.now()}.pdf"`);
  doc.pipe(res);

  doc.fontSize(24).font("Helvetica-Bold").text("CostPilot", { align: "center" });
  doc.fontSize(16).font("Helvetica").text("AI Spend Intelligence Report", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: "center" });
  doc.moveDown();

  const totalSpend = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
  doc.fontSize(14).font("Helvetica-Bold").text("Executive Summary");
  doc.moveDown(0.3);
  doc.fontSize(11).font("Helvetica").text(`Total AI Spend: $${totalSpend.toFixed(2)}`);
  doc.text(`Total Transactions: ${expenses.length}`);
  doc.text(`Date Range: ${dateRange?.start || "All time"} to ${dateRange?.end || "All time"}`);
  doc.moveDown();

  doc.fontSize(14).font("Helvetica-Bold").text("Top Expenses");
  doc.moveDown(0.3);
  expenses.slice(0, 20).forEach((e: any) => {
    doc.fontSize(9).font("Helvetica").text(
      `${e.date} | ${(e.platformName || "N/A").padEnd(20)} | $${Number(e.amount).toFixed(2)} | ${e.description || ""}`
    );
  });

  doc.end();
  return;
});

router.post("/schedule", requireAuth, async (req, res) => {
  const schema = z.object({
    templateId: z.string(),
    format: z.enum(["csv", "pdf"]),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    recipients: z.array(z.string().email()).min(1).max(10),
  });

  const body = schema.parse(req.body);
  const id = `sched-${Date.now()}`;
  scheduledReports.set(id, {
    workspaceId: Number(req.query.workspaceId || 0),
    userId: req.userId!,
    format: body.format,
    frequency: body.frequency,
    recipients: body.recipients,
  });

  logger.info({ reportId: id, ...body }, "Report scheduled");
  res.status(201).json({ id, ...body, status: "active" });
});

router.get("/scheduled", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const reports = Array.from(scheduledReports.entries())
    .filter(([_, r]) => r.userId === userId)
    .map(([id, r]) => ({ id, ...r }));
  res.json(reports);
});

router.delete("/scheduled/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  if (scheduledReports.has(id)) {
    scheduledReports.delete(id);
    return res.status(204).send();
  }
  return res.status(404).json({ error: "Scheduled report not found" });
});

export default router;
