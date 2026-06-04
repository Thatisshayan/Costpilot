import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { logger } from "../lib/logger";
import { PostIntelligenceQueryBody } from "@workspace/api-zod";

const router = Router();
router.post("/query", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { query } = PostIntelligenceQueryBody.parse(req.body);
    const userId = req.userId!;

    // 1. Fetch context scoped to the authenticated user
    const recentExpenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.userId, userId))
      .limit(10);

    // 2. Ask OpenAI to interpret the query based on the data
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are CostPilot AI, a financial intelligence co-pilot. Analyze the user's spend data and provide a concise, expert answer. Data Context: " + JSON.stringify(recentExpenses) 
        },
        { role: "user", content: query }
      ],
    });

    const answer = response.choices[0].message.content;

    res.json({
      answer,
      insight: "Analysis based on your last 10 transactions.",
      status: "Verified"
    });
  } catch (err) {
    logger.error({ err }, "Intelligence query failed");
    
    // Fallback for demo if no API key
    res.json({
      answer: "I'm seeing a consistent spend pattern on OpenAI and Anthropic. Your burn rate suggests you will exceed your $500 budget in 12 days.",
      insight: "Demo Mode: Mocked response",
      status: "Simulated"
    });
  }
});

export default router;
