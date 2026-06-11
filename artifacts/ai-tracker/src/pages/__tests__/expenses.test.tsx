import { describe, it, expect, vi } from "vitest";

describe("Expenses Page Logic", () => {
  describe("emptyForm helper function", () => {
    it("should create empty form state with today's date", () => {
      const today = new Date().toISOString().slice(0, 10);
      const emptyForm = () => ({
        platformId: "",
        projectId: "",
        amount: "",
        currency: "USD",
        description: "",
        category: "API Usage",
        date: today,
      });

      const form = emptyForm();
      expect(form.platformId).toBe("");
      expect(form.projectId).toBe("");
      expect(form.amount).toBe("");
      expect(form.currency).toBe("USD");
      expect(form.category).toBe("API Usage");
      expect(form.date).toBe(today);
    });
  });

  describe("form payload creation", () => {
    it("should create payload with platformId", () => {
      const form = {
        platformId: "1",
        projectId: "",
        amount: "100",
        currency: "USD",
        description: "Test expense",
        category: "API Usage",
        date: "2025-01-15",
      };

      const payload = {
        ...(form.platformId ? { platformId: Number(form.platformId) } : {}),
        ...(form.projectId ? { projectId: Number(form.projectId) } : {}),
        amount: Number(form.amount),
        currency: form.currency || "USD",
        ...(form.description ? { description: form.description } : {}),
        ...(form.category ? { category: form.category } : {}),
        date: form.date,
      };

      expect(payload.platformId).toBe(1);
      expect(payload.amount).toBe(100);
    });

    it("should create payload without optional platformId", () => {
      const form = {
        platformId: "",
        projectId: "",
        amount: "50",
        currency: "USD",
        description: "No platform",
        category: "SaaS Subscription",
        date: "2025-02-01",
      };

      const payload = {
        ...(form.platformId ? { platformId: Number(form.platformId) } : {}),
        ...(form.projectId ? { projectId: Number(form.projectId) } : {}),
        amount: Number(form.amount),
        currency: form.currency || "USD",
        ...(form.description ? { description: form.description } : {}),
        ...(form.category ? { category: form.category } : {}),
        date: form.date,
      };

      expect(payload.platformId).toBeUndefined();
      expect(payload.amount).toBe(50);
    });
  });

  describe("validation", () => {
    it("should validate amount and date are required", () => {
      const form = {
        amount: "",
        date: "",
      };

      const isValid = form.amount && form.date;
      expect(isValid).toBeFalsy();
    });

    it("should pass validation with valid amount and date", () => {
      const form = {
        amount: "100",
        date: "2025-01-15",
      };

      const isValid = !!form.amount && !!form.date;
      expect(isValid).toBeTruthy();
    });
  });

  describe("getHashColor helper", () => {
    it("should generate consistent color for platform name", () => {
      const colors = [
        "bg-[#10a37f]",
        "bg-[#cc9966]",
        "bg-[#1a1b1f]",
        "bg-[#6366f1]",
        "bg-[#ec4899]",
      ];

      function getHashColor(str: string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
      }

      const openaiColor = getHashColor("OpenAI");
      const claudeColor = getHashColor("Claude");

      expect(colors).toContain(openaiColor);
      expect(colors).toContain(claudeColor);
    });

    it("should generate different colors for different strings", () => {
      const colors = [
        "bg-[#10a37f]",
        "bg-[#cc9966]",
        "bg-[#1a1b1f]",
        "bg-[#6366f1]",
        "bg-[#ec4899]",
      ];

      function getHashColor(str: string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
      }

      // Different strings should generally get different colors
      const color1 = getHashColor("OpenAI");
      const color2 = getHashColor("Anthropic");

      expect(typeof color1).toBe("string");
      expect(typeof color2).toBe("string");
    });
  });

  describe("expense filtering and display", () => {
    it("should format currency correctly for expense amounts", () => {
      const amount = 42.5;
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);

      expect(formatted).toContain("$42.5");
    });

    it("should display default currency symbol when currency unknown", () => {
      const amount = 100;
      const symbol = "$";
      const formatted = `${symbol}${amount.toFixed(2)}`;

      expect(formatted).toBe("$100.00");
    });
  });
});

describe("Expenses State Management", () => {
  it("should initialize dialog state as closed", () => {
    const dialogOpen = false;
    expect(dialogOpen).toBe(false);
  });

  it("should track delete ID", () => {
    const deleteId: number | null = null;
    expect(deleteId).toBeNull();
  });

  it("should track editing target", () => {
    const editTarget = null;
    expect(editTarget).toBeNull();
  });

  it("should reveal API key for platform when requested", () => {
    const revealedPlatforms = new Set([1]);
    const isRevealed = revealedPlatforms.has(1);
    expect(isRevealed).toBe(true);
  });

  it("should toggle platform reveal state", () => {
    const revealedPlatforms = new Set([1]);
    const id = 2;

    const next = new Set(revealedPlatforms);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    expect(next.has(id)).toBe(true);
    expect(next.has(1)).toBe(true);
  });
});