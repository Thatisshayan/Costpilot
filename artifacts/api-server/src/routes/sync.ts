import { Router } from "express";
import { db, platformsTable, expensesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.post("/sync", async (req, res) => {
  const id = Number(req.params.id);
  const [platform] = await db.select().from(platformsTable).where(eq(platformsTable.id, id));
  if (!platform) return res.status(404).json({ error: "Platform not found" });

  if (!platform.apiKey) {
    return res.json({ success: false, message: "No API key configured for this platform. Add your API key in the platform settings to enable auto-sync.", expensesImported: 0 });
  }

  if (platform.name.toLowerCase().includes("openai")) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startTs = Math.floor(startOfMonth.getTime() / 1000);
      const endTs = Math.floor(now.getTime() / 1000);

      const resp = await fetch(
        `https://api.openai.com/v1/usage?start_time=${startTs}&end_time=${endTs}`,
        { headers: { Authorization: `Bearer ${platform.apiKey}` } }
      );

      if (!resp.ok) {
        return res.json({ success: false, message: `OpenAI API responded with ${resp.status}: ${await resp.text()}`, expensesImported: 0 });
      }

      const data = await resp.json() as { data?: Array<{ aggregation_timestamp: number; n_context_tokens_total: number; n_generated_tokens_total: number }> };
      const today = now.toISOString().slice(0, 10);

      await db.insert(expensesTable).values({
        platformId: id,
        amount: "0",
        currency: "USD",
        description: `Auto-synced OpenAI usage for ${today} — ${data.data?.length ?? 0} data points`,
        category: "API usage",
        date: today,
      });

      return res.json({ success: true, message: "OpenAI usage synced successfully.", expensesImported: 1 });
    } catch (err) {
      return res.json({ success: false, message: `Sync failed: ${(err as Error).message}`, expensesImported: 0 });
    }
  }

  return res.json({ success: false, message: `Auto-sync is not yet supported for ${platform.name}. Supported: OpenAI. More platforms coming soon.`, expensesImported: 0 });
});

export default router;
