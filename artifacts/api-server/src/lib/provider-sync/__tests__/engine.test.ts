import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({ db: {}, expensesTable: {}, platformsTable: {} }));
vi.mock("../../kms-vault", () => ({ decrypt: (v: string) => v }));

import { BACKFILL_DAYS, RESYNC_DAYS, consolidate, counterDelta, syncExternalId, syncWindow } from "../engine";

describe("counter deltas", () => {
  it("treats the first reading as a baseline", () => {
    expect(counterDelta(null, 50, "balance")).toBe(0);
  });
  it("books a falling balance as spend and ignores top-ups", () => {
    expect(counterDelta(50, 42.5, "balance")).toBe(7.5);
    expect(counterDelta(42.5, 100, "balance")).toBe(0);
  });
  it("books a rising spend counter, and a reset as all-new spend", () => {
    expect(counterDelta(3, 7, "spend")).toBe(4);
    expect(counterDelta(30, 2, "spend")).toBe(2);
  });
});

describe("sync window", () => {
  const now = new Date("2026-11-17T15:30:00Z");

  it("backfills on the first sync and ends after today (UTC)", () => {
    const w = syncWindow({ lastSyncedAt: null }, now);
    expect(w.to.toISOString()).toBe("2026-11-18T00:00:00.000Z");
    expect((w.to.getTime() - w.from.getTime()) / 86_400_000).toBe(BACKFILL_DAYS + 1);
  });

  it("re-pulls a fixed recent window afterwards so provider revisions land", () => {
    const w = syncWindow({ lastSyncedAt: new Date("2026-11-17T09:00:00Z") }, now);
    expect((w.to.getTime() - w.from.getTime()) / 86_400_000).toBe(RESYNC_DAYS + 1);
  });
});

describe("consolidate", () => {
  it("sums lines sharing a day, key and currency, then rounds to cents", () => {
    const out = consolidate([
      { date: "2026-11-01", key: "m", amount: 0.004, currency: "USD", description: "a" },
      { date: "2026-11-01", key: "m", amount: 0.003, currency: "USD", description: "a" },
      { date: "2026-11-01", key: "m", amount: 5, currency: "EUR", description: "a" },
      { date: "2026-11-02", key: "m", amount: 1.006, currency: "USD", description: "a" },
    ]);
    expect(out.map(c => [c.date, c.currency, c.amount])).toEqual([
      ["2026-11-01", "USD", 0.01], ["2026-11-01", "EUR", 5], ["2026-11-02", "USD", 1.01],
    ]);
  });
});

describe("external ids", () => {
  it("are stable per provider, platform, day, key and currency", () => {
    const id = syncExternalId("anthropic", 7, { date: "2026-11-01", key: "claude-opus-5-5", currency: "USD" });
    expect(id).toBe("anthropic:7:2026-11-01:claude-opus-5-5:USD");
  });
});
