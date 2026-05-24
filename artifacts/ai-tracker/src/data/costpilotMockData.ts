export interface KpiData {
  label: string;
  value: string;
  subtext: string;
  trend?: "up" | "down";
  isUrgent?: boolean;
  highlight?: boolean;
  iconName: string;
}

export interface SpendingData {
  month: string;
  subscriptionSpend: number;
  apiUsageSpend: number;
  infrastructureSpend: number;
  forecastSpend: number;
}

export interface SavingsOpportunity {
  id: number;
  issue: string;
  impact: string;
  action: string;
  description: string;
  evidence: string;
  confidence: number;
}

export interface ActivityLog {
  vendor: string;
  type: string;
  amount: string;
  date: string;
  status: "Active" | "Trial" | "Renewing" | "Processed" | "Infrastructure" | "Monthly";
  risk: "Spike" | "Renewal" | "Unused" | "Duplicate" | "";
}

export const costpilotMockData = {
  summary: {
    totalAiSpend: 1279.73,
    monthToDateSpend: 1253.76,
    lastMonthTotalSpend: 1112.47,
    monthToDateChangePercent: 12.7,
    activeAiTools: 38,
    activeToolsUnusedCount: 9,
    renewalsThisWeek: 5,
    upcomingRenewalAmount: 138.00,
    apiSpendToday: 38.42,
    budgetUsedPercent: 123,
    budgetTotal: 1250,
    forecastTotal: 1540,
    avgApiCostPerRequest: 0.014,
    totalSavingsFound: 214.50
  },
  spendingTrend: [
    { month: "Jan", subscriptionSpend: 320, apiUsageSpend: 280, infrastructureSpend: 100, forecastSpend: 400 },
    { month: "Feb", subscriptionSpend: 340, apiUsageSpend: 310, infrastructureSpend: 110, forecastSpend: 420 },
    { month: "Mar", subscriptionSpend: 380, apiUsageSpend: 450, infrastructureSpend: 120, forecastSpend: 500 },
    { month: "Apr", subscriptionSpend: 400, apiUsageSpend: 380, infrastructureSpend: 115, forecastSpend: 550 },
    { month: "May", subscriptionSpend: 442, apiUsageSpend: 386, infrastructureSpend: 128, forecastSpend: 600 },
    { month: "Jun", subscriptionSpend: 460, apiUsageSpend: 520, infrastructureSpend: 140, forecastSpend: 1540 },
  ],
  savingsOpportunities: [
    {
      id: 1,
      issue: "Runway appears unused",
      impact: "Save $35/mo",
      action: "Cancel",
      description: "No detected activity in 21 days. Cancel or downgrade before the next billing cycle.",
      evidence: "No login or charge activity detected in 21 days",
      confidence: 0.98
    },
    {
      id: 2,
      issue: "Claude Pro renewal risk",
      impact: "Save $20/mo",
      action: "Review",
      description: "Auto-renewal detected in 2 days. Evaluate team seat utilization before charge.",
      evidence: "Auto-renewal detected in 2 days",
      confidence: 0.95
    },
    {
      id: 3,
      issue: "OpenAI usage spike",
      impact: "+42% cost increase",
      action: "Set limit",
      description: "Unusual activity pattern detected in the last 24 hours compared to your 7-day average.",
      evidence: "Usage increased 42% compared to last 7-day average",
      confidence: 0.92
    },
    {
      id: 4,
      issue: "Duplicate research tools",
      impact: "Save $40/mo",
      action: "Consolidate",
      description: "You have active subscriptions for Perplexity, ChatGPT, and Gemini. Consolidation recommended.",
      evidence: "Perplexity, ChatGPT, and Gemini used for similar research tasks",
      confidence: 0.88
    }
  ],
  recentActivity: [
    { vendor: "OpenAI API", type: "API Usage", amount: "$48.76", date: "Today", status: "Active", risk: "Spike" },
    { vendor: "Claude Pro", type: "Subscription", amount: "$20.00", date: "Jun 13", status: "Active", risk: "Renewal" },
    { vendor: "Runway", type: "Subscription", amount: "$35.00", date: "Jun 18", status: "Active", risk: "Unused" },
    { vendor: "Midjourney", type: "Subscription", amount: "$30.00", date: "Jun 14", status: "Active", risk: "Renewal" },
    { vendor: "Cursor Pro", type: "Subscription", amount: "$20.00", date: "Jun 21", status: "Active", risk: "Renewal" },
    { vendor: "Perplexity", type: "Subscription", amount: "$20.00", date: "Jun 15", status: "Trial", risk: "Duplicate" },
    { vendor: "ElevenLabs", type: "API Usage", amount: "$33.00", date: "Jun 16", status: "Active", risk: "Renewal" },
    { vendor: "Vercel", type: "Infrastructure", amount: "$24.00", date: "Jun 28", status: "Active", risk: "" },
  ],
  connectedSources: [
    { id: 1, name: "Chase Business Card", type: "Bank", status: "Connected", lastSync: "2 mins ago" },
    { id: 2, name: "OpenAI Main", type: "API", status: "Connected", lastSync: "1 hour ago" },
    { id: 3, name: "Anthropic Team", type: "API", status: "Syncing", lastSync: "Now" },
    { id: 4, name: "AWS Production", type: "Infrastructure", status: "Error", lastSync: "4 hours ago" },
  ]
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (dateStr: string) => {
  // Simple check for "Today" or relative strings
  if (dateStr === "Today") return "Today";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateStr;
  }
};
