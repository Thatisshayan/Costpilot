// Narrow-screen smoke test (Batch 1 acceptance 10): every live route at 375px wide must
// render without horizontal page scrolling, for an owner and a viewer, in Personal and
// workspace scope. API calls are answered from fixtures; nothing leaves the machine.
// Run: node artifacts/ai-tracker/e2e/narrow-viewport.mjs [screenshotDir]
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });

const long = "Annual enterprise agreement for observability, including overage for log ingestion and retention beyond thirty days";
const fixtures = role => ({
  "/api/workspaces": [{ id: 5, name: "Platform engineering and data infrastructure team", slug: "platform-1a2b3c4d", ownerId: "e2e-owner", onboarded: true, createdAt: "2026-11-01", role }],
  "/api/expenses": [
    { id: 1, workspaceId: 5, amount: 18234.55, currency: "USD", date: "2026-11-03", platformId: 1, platformName: "Amazon Web Services", projectName: "Checkout service", category: "Compute", description: long },
    { id: 2, workspaceId: 5, amount: -120.0, currency: "EUR", date: "2026-11-02", platformName: "OpenAI", category: "AI / LLM API", description: "Credit" },
    { id: 3, workspaceId: null, amount: 9.99, currency: "GBP", date: "2026-11-01", platformName: "Figma", category: "SaaS subscription" },
  ],
  "/api/platforms": [{ id: 1, workspaceId: 5, name: "Amazon Web Services", category: "Cloud infrastructure", website: "https://aws.amazon.com", notes: long, apiKey: "••••••••" }],
  "/api/projects": [{ id: 1, workspaceId: 5, name: "Checkout service with a deliberately long project name for wrapping" }],
  "/api/workspaces/5/members": [
    { id: 1, workspaceId: 5, userId: "e2e-owner", email: "very.long.email.address.for.layout@example-company.test", role, status: "active", createdAt: "2026-11-01" },
    { id: 2, workspaceId: 5, userId: "pending-x", email: "new.member@example-company.test", role: "viewer", status: "pending", createdAt: "2026-11-02" },
  ],
  "/api/healthz": { status: "ok" },
  "/api/expenses/search": {
    items: [
      { id: 1, workspaceId: 5, amount: 18234.55, currency: "USD", date: "2026-11-03", createdAt: "2026-11-03T00:00:00Z", platformId: 1, platformName: "Amazon Web Services", projectId: 1, projectName: "Checkout service", category: "Compute", description: long },
      { id: 2, workspaceId: 5, amount: -120, currency: "EUR", date: "2026-11-02", createdAt: "2026-11-02T00:00:00Z", platformName: "OpenAI", projectName: null, category: "AI / LLM API", description: "Credit" },
      { id: 4, workspaceId: 5, amount: 1500, currency: "JPY", date: "2026-11-01", createdAt: "2026-11-01T00:00:00Z", platformName: null, projectName: null, category: "SaaS subscription", description: null },
    ],
    total: 63, limit: 25, offset: 0,
    totals: [{ currency: "EUR", net: "-120.00", count: 1 }, { currency: "JPY", net: "1500.00", count: 1 }, { currency: "USD", net: "18234.55", count: 61 }],
  },
  "/api/budgets/status": {
    workspaceId: 5,
    period: { month: "2026-11", start: "2026-11-01", end: "2026-11-30", through: "2026-11-05", isPartial: true },
    budgets: [
      { budget: { id: 1, workspaceId: 5, projectId: 1, projectName: "Checkout service with a deliberately long project name for wrapping", name: "Cloud infrastructure for the checkout service", period: "monthly", currency: "USD", amount: "15000.00", thresholds: [50, 80, 100], createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z" },
        net: "18234.55", charges: "18234.55", credits: "0.00", count: 61, remaining: "-3234.55", percentUsed: 121.6, thresholdReached: 100, state: "over" },
      { budget: { id: 2, workspaceId: 5, projectId: null, projectName: null, name: "AI APIs", period: "monthly", currency: "EUR", amount: "500.00", thresholds: [80], createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z" },
        net: "-120.00", charges: "0.00", credits: "-120.00", count: 1, remaining: "620.00", percentUsed: -24, thresholdReached: null, state: "ok" },
    ],
  },
  "/api/imports": [
    { id: 3, workspaceId: 5, fileName: "aws-cost-and-usage-report-2026-10-with-a-very-long-file-name.csv", rowCount: 412, insertedCount: 398, skippedCount: 14, createdAt: "2026-11-02T10:00:00Z", undoneAt: null },
  ],
  "/api/spend/summary": {
    workspaceId: 5,
    period: { month: "2026-11", start: "2026-11-01", end: "2026-11-30", through: "2026-11-05", isPartial: true },
    comparison: { month: "2026-10", start: "2026-10-01", through: "2026-10-05", basis: "same-days" },
    currencies: [{
      currency: "USD", net: "18234.55", charges: "18234.55", credits: "0.00", count: 61, previousNet: "0.00", changeAmount: "18234.55", changePercent: null,
      byVendor: [{ id: 1, name: "Amazon Web Services", net: "18234.55", count: 61 }],
      byProject: [{ id: 1, name: "Checkout service with a deliberately long project name for wrapping", net: "18234.55", count: 61 }],
      byCategory: [{ name: "Compute", net: "18234.55", count: 61 }],
      trend: ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"].map(month => ({ month, net: month === "2026-11" ? "18234.55" : "0.00" })),
    }],
  },
});

const server = await createServer({ configFile: path.join(here, "vite.e2e.config.ts"), logLevel: "error" });
await server.listen();
const origin = "http://127.0.0.1:4319";
const browser = await chromium.launch();
const failures = [];
let checked = 0;
try {
  for (const role of ["owner", "viewer"]) {
    for (const scope of [null, 5]) {
      const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
      const data = fixtures(role);
      await context.route("**/api/**", route => {
        const url = new URL(route.request().url());
        const body = data[url.pathname];
        return body === undefined ? route.fulfill({ status: 404, json: { error: "Not found" } }) : route.fulfill({ json: body });
      });
      await context.addInitScript(id => {
        if (id === null) localStorage.removeItem("costpilot.activeWorkspace.e2e-owner");
        else localStorage.setItem("costpilot.activeWorkspace.e2e-owner", String(id));
      }, scope);
      const page = await context.newPage();
      for (const route of ["/", "/expenses", "/import", "/budgets", "/projects", "/vendors", "/collaboration", "/accept-invite?token=" + "a".repeat(64)]) {
        await page.goto(origin + route, { waitUntil: "networkidle" });
        await page.waitForTimeout(300);
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
        const label = `${role}/${scope === null ? "personal" : "workspace"}${route.split("?")[0]}`;
        checked++;
        if (scrollWidth > innerWidth) failures.push(`${label}: page is ${scrollWidth}px wide in a ${innerWidth}px viewport`);
        if (shots) await page.screenshot({ path: path.join(shots, `${label.replace(/\//g, "_") || "root"}.png`), fullPage: true });
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`narrow-viewport: ${checked} route/role/scope combinations fit 375px without horizontal scrolling`);
