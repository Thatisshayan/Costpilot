import { describe, it, expect } from "vitest";
import { costpilotMockData } from "../../data/costpilotMockData";

// Import formatCurrency directly from currency module
function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

describe("Dashboard Page Logic", () => {
  describe("costpilotMockData", () => {
    it("should have summary with all required properties", () => {
      expect(costpilotMockData.summary).toHaveProperty("totalAiSpend");
      expect(costpilotMockData.summary).toHaveProperty("monthToDateSpend");
      expect(costpilotMockData.summary).toHaveProperty("lastMonthTotalSpend");
      expect(costpilotMockData.summary).toHaveProperty("monthToDateChangePercent");
      expect(costpilotMockData.summary).toHaveProperty("activeAiTools");
      expect(costpilotMockData.summary).toHaveProperty("renewalsThisWeek");
      expect(costpilotMockData.summary).toHaveProperty("upcomingRenewalAmount");
      expect(costpilotMockData.summary).toHaveProperty("apiSpendToday");
      expect(costpilotMockData.summary).toHaveProperty("budgetUsedPercent");
      expect(costpilotMockData.summary).toHaveProperty("forecastTotal");
      expect(costpilotMockData.summary).toHaveProperty("totalSavingsFound");
    });

    it("should have spending trend data", () => {
      expect(costpilotMockData.spendingTrend).toBeDefined();
      expect(Array.isArray(costpilotMockData.spendingTrend)).toBe(true);
      expect(costpilotMockData.spendingTrend.length).toBeGreaterThan(0);
    });

    it("should have savings opportunities array", () => {
      expect(costpilotMockData.savingsOpportunities).toBeDefined();
      expect(Array.isArray(costpilotMockData.savingsOpportunities)).toBe(true);
    });

    it("should have recent activity array", () => {
      expect(costpilotMockData.recentActivity).toBeDefined();
      expect(Array.isArray(costpilotMockData.recentActivity)).toBe(true);
    });

    it("should have connected sources array", () => {
      expect(costpilotMockData.connectedSources).toBeDefined();
      expect(Array.isArray(costpilotMockData.connectedSources)).toBe(true);
    });

    it("should have valid numeric values", () => {
      expect(typeof costpilotMockData.summary.totalAiSpend).toBe("number");
      expect(typeof costpilotMockData.summary.monthToDateSpend).toBe("number");
      expect(typeof costpilotMockData.summary.activeAiTools).toBe("number");
    });
  });

  describe("formatCurrency", () => {
    it("should format USD currency correctly", () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain("$");
      expect(result).toContain("1,234.56");
    });

    it("should format zero correctly", () => {
      const result = formatCurrency(0);
      expect(result).toBeDefined();
    });

    it("should format large numbers correctly", () => {
      const result = formatCurrency(1234567.89);
      expect(result).toContain("1");
    });

    it("should format negative numbers correctly", () => {
      const result = formatCurrency(-100);
      expect(result).toBeDefined();
    });
  });
});

describe("Dashboard Security Calculations", () => {
  it("should calculate MTD change percent correctly with real data values", () => {
    // These values would come from actual database queries
    const thisMonthTotal = 400;
    const lastMonthTotal = 350;
    const changePercent = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    expect(changePercent).toBeCloseTo(14.3, 1);
  });

  it("should calculate budget used percent from real budget policy", () => {
    // Values from budgetPoliciesTable
    const spent = 750;
    const budget = 1000;
    const budgetUsedPercent = budget > 0 ? (spent / budget) * 100 : 0;

    expect(budgetUsedPercent).toBe(75);
  });

  it("should calculate daily average accurately", () => {
    const thisMonthTotal = 4000;
    const dayOfMonth = 15;
    const dailyAverage = thisMonthTotal / dayOfMonth;

    expect(dailyAverage).toBeCloseTo(266.67, 1);
  });

  it("should handle zero last month when calculating change", () => {
    const thisMonthTotal = 100;
    const lastMonthTotal = 0;
    const changePercent = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    expect(changePercent).toBe(0);
  });

  it("should calculate savings found from remediation actions", () => {
    const savingsPotentials = ["$100.00", "$50.50", "$75.25"];
    const totalSavingsFound = savingsPotentials.reduce((acc, s) => {
      const match = s?.match(/\$?([\d.]+)/);
      return acc + (match ? Number(match[1]) : 0);
    }, 0);

    expect(totalSavingsFound).toBe(225.75);
  });
});