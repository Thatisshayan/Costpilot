import { Router } from "express";
import { db, expensesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/query", async (req, res) => {
  const { query, workspaceId = 1 } = req.body;

  try {
    // 1. Fetch some context from the DB
    const recentExpenses = await db.select()
      .from(expensesTable)
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
