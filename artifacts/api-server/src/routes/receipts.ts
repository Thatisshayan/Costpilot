import { Router } from "express";
import multer from "multer";
import OpenAI from "openai";
import { db, expensesTable, platformsTable, projectsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit uploads to 5MB to prevent memory exhaustion / DoS (SEC-10)
  },
});

router.post("/upload", upload.single("receipt"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    logger.error("OPENAI_API_KEY environment variable is not defined");
    res.status(500).json({ error: "Failed to parse receipt", message: "AI scanner service is currently unavailable. Please try again later." });
    return;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const mimeType = req.file.mimetype || "image/jpeg";
    if (!allowedMimeTypes.includes(mimeType)) {
      res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." });
      return;
    }

    const base64Image = req.file.buffer.toString("base64");

    logger.info("Parsing receipt with OpenAI Vision...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract transaction details from this receipt. Return a JSON object with: { amount: number, platform: string, category: string, date: string (YYYY-MM-DD), description: string }. If you can't find a field, leave it null." },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response from AI");
    
    const parsed = JSON.parse(content) as { 
      amount: number | null, 
      platform: string | null, 
      category: string | null, 
      date: string | null, 
      description: string | null 
    };

    logger.info({ parsed }, "Receipt parsed successfully");

    // Attempt to match platform/project if possible (fuzzy match or simple check)
    // For now, we return the parsed data to the frontend so the user can verify before saving.
    
    res.json({
      success: true,
      data: parsed
    });

  } catch (err) {
    logger.error(err, "Failed to parse receipt");
    // Obfuscate underlying vendor API errors to client (SEC-09)
    res.status(500).json({ error: "Failed to parse receipt", message: "AI scanner service is currently unavailable. Please try again later." });
  }
});

export default router;
