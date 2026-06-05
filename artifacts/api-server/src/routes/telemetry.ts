import { Router } from "express";
import { logger } from "../lib/logger";
import { 
  db, 
  expensesTable, 
  deploymentPoliciesTable, 
  projectsTable, 
  platformsTable, 
  workspaceMembersTable 
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

// Helper to estimate request cost
function estimateRequestCost(model: string, provider: string, inputTokens: number, outputTokens: number = 0): number {
  const modelLower = model.toLowerCase();
  const providerLower = provider.toLowerCase();
  
  let inputRate = 0.01; // default per 1000 tokens ($10/M tokens)
  let outputRate = 0.03; // default per 1000 tokens ($30/M tokens)

  // OpenAI
  if (providerLower.includes("openai") || modelLower.includes("gpt")) {
    if (modelLower.includes("gpt-4o")) {
      inputRate = 0.005;
      outputRate = 0.015;
    } else if (modelLower.includes("gpt-4")) {
      inputRate = 0.03;
      outputRate = 0.06;
    } else if (modelLower.includes("gpt-3.5")) {
      inputRate = 0.0005;
      outputRate = 0.0015;
    }
  }
  // Anthropic
  else if (providerLower.includes("anthropic") || modelLower.includes("claude")) {
    if (modelLower.includes("claude-3-5")) {
      inputRate = 0.003;
      outputRate = 0.015;
    } else if (modelLower.includes("opus")) {
      inputRate = 0.015;
      outputRate = 0.075;
    } else if (modelLower.includes("haiku")) {
      inputRate = 0.00025;
      outputRate = 0.00125;
    }
  }
  // Mistral
  else if (providerLower.includes("mistral") || modelLower.includes("mistral")) {
    if (modelLower.includes("mistral-large")) {
      inputRate = 0.004;
      outputRate = 0.012;
    } else if (modelLower.includes("mistral-small")) {
      inputRate = 0.001;
      outputRate = 0.003;
    }
  }
  // DeepSeek
  else if (providerLower.includes("deepseek") || modelLower.includes("deepseek")) {
    if (modelLower.includes("deepseek-chat")) {
      inputRate = 0.00014;
      outputRate = 0.00028;
    } else if (modelLower.includes("deepseek-reasoner")) {
      inputRate = 0.00055;
      outputRate = 0.00219;
    }
  }
  // Groq
  else if (providerLower.includes("groq") || modelLower.includes("groq")) {
    inputRate = 0.00001;
    outputRate = 0.00001;
  }
  // Together AI
  else if (providerLower.includes("together") || modelLower.includes("together")) {
    inputRate = 0.002;
    outputRate = 0.002;
  }
  // Cohere
  else if (providerLower.includes("cohere") || modelLower.includes("cohere")) {
    if (modelLower.includes("command-r")) {
      inputRate = 0.0005;
      outputRate = 0.0015;
    }
  }
  // Google / Gemini
  else if (providerLower.includes("google") || modelLower.includes("gemini")) {
    if (modelLower.includes("gemini-1.5-pro")) {
      inputRate = 0.0035;
      outputRate = 0.0105;
    } else if (modelLower.includes("gemini-1.5-flash")) {
      inputRate = 0.00015;
      outputRate = 0.0006;
    }
  }

  return (inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate;
}

// Budget check helper
async function checkBudget(
  userId: string,
  workspaceId?: number,
  projectId?: number,
  estimatedCost: number = 0
): Promise<{ allowed: boolean; currentSpend: number; limit: number; message?: string }> {
  let activeWorkspaceId = workspaceId;
  let activeProjectId = projectId;

  // 1. Resolve workspace context
  if (activeProjectId && !activeWorkspaceId) {
    const [proj] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, activeProjectId));
    if (proj) {
      activeWorkspaceId = proj.workspaceId ?? undefined;
    }
  }

  if (!activeWorkspaceId) {
    const [member] = await db
      .select()
      .from(workspaceMembersTable)
      .where(eq(workspaceMembersTable.userId, userId))
      .limit(1);
    if (member) {
      activeWorkspaceId = member.workspaceId;
    }
  }

  if (!activeWorkspaceId) {
    // If no workspace context exists at all, allow with default bounds
    return { allowed: true, currentSpend: 0, limit: 1000 };
  }

  // 2. Fetch current month's accumulated spend for this workspace
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [spendRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expensesTable.amount}), 0)` })
    .from(expensesTable)
    .where(
      and(
        eq(expensesTable.workspaceId, activeWorkspaceId),
        sql`${expensesTable.date} >= ${thisMonthStart}`
      )
    );

  const currentSpend = Number(spendRow?.total || 0);

  // 3. Check active deployment policies for workspace-level / project-level thresholds
  const policies = await db
    .select()
    .from(deploymentPoliciesTable)
    .where(
      and(
        eq(deploymentPoliciesTable.isActive, true),
        eq(deploymentPoliciesTable.workspaceId, activeWorkspaceId)
      )
    );

  let hardLimit = 500.00; // default hard limit

  for (const policy of policies) {
    if (policy.ruleType === "budget_threshold") {
      const threshVal = Number(policy.threshold);
      if (!isNaN(threshVal)) {
        if (policy.action === "block") {
          hardLimit = Math.min(hardLimit, threshVal);
        }
      }
    }
  }

  // Check project-specific policies
  if (activeProjectId) {
    const projPolicies = await db
      .select()
      .from(deploymentPoliciesTable)
      .where(
        and(
          eq(deploymentPoliciesTable.isActive, true),
          eq(deploymentPoliciesTable.projectId, activeProjectId)
        )
      );

    for (const policy of projPolicies) {
      if (policy.ruleType === "budget_threshold") {
        const threshVal = Number(policy.threshold);
        if (!isNaN(threshVal)) {
          if (policy.action === "block") {
            hardLimit = Math.min(hardLimit, threshVal);
          }
        }
      }
    }
  }

  const projectedSpend = currentSpend + estimatedCost;

  if (projectedSpend > hardLimit) {
    return {
      allowed: false,
      currentSpend,
      limit: hardLimit,
      message: "Workspace/Project budget exceeded. CostPilot blocked this downstream LLM request."
    };
  }

  return {
    allowed: true,
    currentSpend,
    limit: hardLimit
  };
}

// GPU Cluster Telemetry (Simulated)
router.get("/gpu", (req, res) => {
  res.json({
    status: "Healthy",
    clusters: [
      { id: "h100-us-east", name: "H100 Cluster A", utilization: 82, temperature: 68, activeJobs: 14, costPerHour: 12.50 },
      { id: "a100-us-west", name: "A100 Cluster B", utilization: 45, temperature: 62, activeJobs: 8, costPerHour: 4.20 },
    ],
    totalBurn: 16.70,
    unit: "USD/hr"
  });
});

// LLM Route Telemetry (Unified)
router.post("/llm-route", async (req, res) => {
  try {
    const userId = req.userId!;
    const { 
      model = "gpt-4o", 
      provider = "openai", 
      tokens, 
      latency = 120,
      workspaceId,
      projectId
    } = req.body;

    let promptTokens = 1000;
    let completionTokens = 500;
    
    if (typeof tokens === "number") {
      promptTokens = Math.round(tokens * 0.7);
      completionTokens = Math.round(tokens * 0.3);
    } else if (tokens && typeof tokens === "object") {
      promptTokens = Number(tokens.prompt || tokens.input || 1000);
      completionTokens = Number(tokens.completion || tokens.output || 500);
    }

    const estimatedCost = estimateRequestCost(model, provider, promptTokens, completionTokens);

    const check = await checkBudget(
      userId,
      workspaceId ? Number(workspaceId) : undefined,
      projectId ? Number(projectId) : undefined,
      estimatedCost
    );

    if (!check.allowed) {
      res.status(402).json({
        error: "PaymentRequired",
        message: "Workspace/Project budget exceeded. CostPilot blocked this downstream LLM request.",
        currentSpend: check.currentSpend,
        limit: check.limit,
        estimatedCost
      });
      return;
    }

    // Capture and Log Telemetry directly into expensesTable
    let resolvedWorkspaceId = workspaceId ? Number(workspaceId) : undefined;
    if (projectId && !resolvedWorkspaceId) {
      const [proj] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, Number(projectId)));
      if (proj) {
        resolvedWorkspaceId = proj.workspaceId ?? undefined;
      }
    }
    if (!resolvedWorkspaceId) {
      const [member] = await db
        .select()
        .from(workspaceMembersTable)
        .where(eq(workspaceMembersTable.userId, userId))
        .limit(1);
      if (member) {
        resolvedWorkspaceId = member.workspaceId;
      }
    }

    let activePlatformId: number | null = null;
    if (provider) {
      const [p] = await db
        .select()
        .from(platformsTable)
        .where(
          and(
            eq(platformsTable.userId, userId),
            sql`LOWER(${platformsTable.name}) = LOWER(${provider})`
          )
        )
        .limit(1);
      if (p) {
        activePlatformId = p.id;
      }
    }

    const [newExpense] = await db.insert(expensesTable).values({
      userId,
      workspaceId: resolvedWorkspaceId || null,
      projectId: projectId ? Number(projectId) : null,
      platformId: activePlatformId,
      amount: estimatedCost.toFixed(4),
      currency: "USD",
      category: "API Usage",
      date: new Date().toISOString(),
      description: `CostPilot Proxy: Simulated LLM route. Model: ${model} (Provider: ${provider}). Tokens: ${promptTokens} prompt, ${completionTokens} completion. Latency: ${latency}ms.`,
      tags: `llm,proxy,${provider},${model}`
    }).returning();

    logger.info({ expenseId: newExpense.id, model, provider, tokens, latency }, "LLM Route Telemetry Recorded and Expense Logged");

    res.json({
      success: true,
      trackingId: `llm-${Math.random().toString(36).substr(2, 9)}`,
      estimatedCost,
      expenseId: newExpense.id,
      choices: [
        {
          message: {
            role: "assistant",
            content: `Hello! I am a simulated response from CostPilot LLM Telemetry Proxy. Your request is fully compliant with budget guardrails.\n\n### Metrics:\n* Provider: **${provider}**\n* Model: **${model}**\n* Tokens: **${promptTokens + completionTokens}**\n* Status: **Allowed**`
          }
        }
      ]
    });
  } catch (error: any) {
    logger.error({ error }, "Error recording LLM Route Telemetry");
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

// OpenAI proxy routes (supports both styles of standard completions endpoints)
router.post(["/chat/completions", "/v1/chat/completions"], async (req, res) => {
  try {
    const userId = req.userId!;
    const { 
      model = "gpt-4o", 
      messages = [], 
      max_tokens = 500,
      workspaceId,
      projectId
    } = req.body;

    const provider = "openai";

    // Estimate input tokens from message character length (simple 1 token = ~4 chars rule of thumb)
    let promptTokens = 0;
    for (const msg of messages) {
      if (msg.content && typeof msg.content === "string") {
        promptTokens += Math.ceil(msg.content.length / 4);
      }
    }
    if (promptTokens === 0) promptTokens = 1000; // fallback default input

    const completionTokens = max_tokens || 500;

    const estimatedCost = estimateRequestCost(model, provider, promptTokens, completionTokens);

    // Resolve workspaceId/projectId from headers or body
    const reqWorkspaceId = workspaceId || req.headers["x-workspace-id"];
    const reqProjectId = projectId || req.headers["x-project-id"];

    const check = await checkBudget(
      userId,
      reqWorkspaceId ? Number(reqWorkspaceId) : undefined,
      reqProjectId ? Number(reqProjectId) : undefined,
      estimatedCost
    );

    if (!check.allowed) {
      res.status(402).json({
        error: "PaymentRequired",
        message: "Workspace/Project budget exceeded. CostPilot blocked this downstream LLM request.",
        currentSpend: check.currentSpend,
        limit: check.limit,
        estimatedCost
      });
      return;
    }

    // Resolve workspace context
    let resolvedWorkspaceId = reqWorkspaceId ? Number(reqWorkspaceId) : undefined;
    if (reqProjectId && !resolvedWorkspaceId) {
      const [proj] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, Number(reqProjectId)));
      if (proj) {
        resolvedWorkspaceId = proj.workspaceId ?? undefined;
      }
    }
    if (!resolvedWorkspaceId) {
      const [member] = await db
        .select()
        .from(workspaceMembersTable)
        .where(eq(workspaceMembersTable.userId, userId))
        .limit(1);
      if (member) {
        resolvedWorkspaceId = member.workspaceId;
      }
    }

    let activePlatformId: number | null = null;
    const [p] = await db
      .select()
      .from(platformsTable)
      .where(
        and(
          eq(platformsTable.userId, userId),
          sql`LOWER(${platformsTable.name}) = LOWER(${provider})`
        )
      )
      .limit(1);
    if (p) {
      activePlatformId = p.id;
    }

    const latency = Math.floor(100 + Math.random() * 200);

    const [newExpense] = await db.insert(expensesTable).values({
      userId,
      workspaceId: resolvedWorkspaceId || null,
      projectId: reqProjectId ? Number(reqProjectId) : null,
      platformId: activePlatformId,
      amount: estimatedCost.toFixed(4),
      currency: "USD",
      category: "API Usage",
      date: new Date().toISOString(),
      description: `CostPilot Proxy: OpenAI ChatCompletion. Model: ${model}. Tokens: ${promptTokens} prompt, ${completionTokens} completion. Latency: ${latency}ms.`,
      tags: `llm,proxy,openai,${model}`
    }).returning();

    logger.info({ expenseId: newExpense.id, model, promptTokens, completionTokens }, "OpenAI Proxy ChatCompletion Telemetry Recorded");

    res.json({
      id: `chatcmpl-${Math.random().toString(36).substr(2, 9)}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: `Hello! I am a simulated response from CostPilot LLM Telemetry Proxy.\n\n### Budget Status\n* **Allowed**: Yes\n* **Estimated cost of this request**: $${estimatedCost.toFixed(4)}\n* **Logged Expense ID**: ${newExpense.id}\n\nYour workspace budget checks have successfully passed compliance checks.`
          },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    });
  } catch (error: any) {
    logger.error({ error }, "Error in OpenAI Proxy ChatCompletion");
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

export default router;
