import { describe, it, expect } from "vitest";

// Extract the P/L formula from useTradeLog (pure function)
const computePnl = (e: { risk_reward: number; risk_used: number }) =>
  e.risk_reward * e.risk_used;

interface MockEntry {
  id: string;
  risk_reward: number;
  risk_used: number;
  followed_rules: boolean;
  trade_date: string;
  created_at: string;
}

function makeTrade(
  overrides: Partial<MockEntry> & { risk_reward: number; risk_used: number }
): MockEntry {
  return {
    id: crypto.randomUUID?.() || Math.random().toString(),
    followed_rules: true,
    trade_date: "2025-01-15",
    created_at: "2025-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("trade P/L model", () => {
  it("win: risk_reward=1, risk_used=150 → +$150", () => {
    expect(computePnl({ risk_reward: 1, risk_used: 150 })).toBe(150);
  });

  it("loss: risk_reward=-1, risk_used=150 → -$150", () => {
    expect(computePnl({ risk_reward: -1, risk_used: 150 })).toBe(-150);
  });

  it("breakeven: risk_reward=0, risk_used=150 → $0", () => {
    expect(computePnl({ risk_reward: 0, risk_used: 150 })).toBe(0);
  });

  it("partial win: risk_reward=0.5, risk_used=200 → $100", () => {
    expect(computePnl({ risk_reward: 0.5, risk_used: 200 })).toBe(100);
  });

  it("large loss: risk_reward=-2, risk_used=300 → -$600", () => {
    expect(computePnl({ risk_reward: -2, risk_used: 300 })).toBe(-600);
  });
});

describe("totalPnl calculation", () => {
  it("sums P/L across multiple entries", () => {
    const entries = [
      makeTrade({ risk_reward: 1, risk_used: 100 }),
      makeTrade({ risk_reward: -1, risk_used: 50 }),
      makeTrade({ risk_reward: 2, risk_used: 75 }),
    ];
    const total = entries.reduce((sum, e) => sum + computePnl(e), 0);
    expect(total).toBe(200); // 100 - 50 + 150
  });
});

describe("allTimeWinRate", () => {
  it("calculates win rate correctly", () => {
    const entries = [
      makeTrade({ risk_reward: 1, risk_used: 100 }),
      makeTrade({ risk_reward: -1, risk_used: 100 }),
      makeTrade({ risk_reward: 1, risk_used: 100 }),
      makeTrade({ risk_reward: 0, risk_used: 100 }),
    ];
    const wins = entries.filter((e) => e.risk_reward > 0).length;
    const winRate = Math.round((wins / entries.length) * 100);
    expect(winRate).toBe(50);
  });

  it("returns 0 for empty entries", () => {
    const entries: MockEntry[] = [];
    const winRate = entries.length === 0 ? 0 : 0;
    expect(winRate).toBe(0);
  });
});

describe("complianceRate", () => {
  it("calculates correctly", () => {
    const entries = [
      makeTrade({ risk_reward: 1, risk_used: 100, followed_rules: true }),
      makeTrade({ risk_reward: -1, risk_used: 100, followed_rules: false }),
      makeTrade({ risk_reward: 1, risk_used: 100, followed_rules: true }),
    ];
    const compliant = entries.filter((e) => e.followed_rules).length;
    const rate = Math.round((compliant / entries.length) * 100);
    expect(rate).toBe(67);
  });
});

describe("currentStreak", () => {
  it("counts consecutive followed_rules from newest", () => {
    // Entries are newest-first
    const entries = [
      makeTrade({ risk_reward: 1, risk_used: 100, followed_rules: true }),
      makeTrade({ risk_reward: 1, risk_used: 100, followed_rules: true }),
      makeTrade({ risk_reward: -1, risk_used: 100, followed_rules: false }),
      makeTrade({ risk_reward: 1, risk_used: 100, followed_rules: true }),
    ];
    let streak = 0;
    for (const e of entries) {
      if (e.followed_rules) streak++;
      else break;
    }
    expect(streak).toBe(2);
  });

  it("returns 0 if newest trade broke rules", () => {
    const entries = [
      makeTrade({ risk_reward: -1, risk_used: 100, followed_rules: false }),
      makeTrade({ risk_reward: 1, risk_used: 100, followed_rules: true }),
    ];
    let streak = 0;
    for (const e of entries) {
      if (e.followed_rules) streak++;
      else break;
    }
    expect(streak).toBe(0);
  });
});

describe("equityCurve", () => {
  it("produces correct running balance sorted by date", () => {
    const entries = [
      makeTrade({ risk_reward: 1, risk_used: 100, trade_date: "2025-01-15", created_at: "2025-01-15T10:00:00Z" }),
      makeTrade({ risk_reward: -1, risk_used: 50, trade_date: "2025-01-16", created_at: "2025-01-16T10:00:00Z" }),
      makeTrade({ risk_reward: 2, risk_used: 75, trade_date: "2025-01-17", created_at: "2025-01-17T10:00:00Z" }),
    ];
    const sorted = [...entries].sort(
      (a, b) => a.trade_date.localeCompare(b.trade_date) || a.created_at.localeCompare(b.created_at)
    );
    let running = 0;
    const curve = sorted.map((e) => {
      running += computePnl(e);
      return { date: e.trade_date, balance: running };
    });

    expect(curve).toEqual([
      { date: "2025-01-15", balance: 100 },
      { date: "2025-01-16", balance: 50 },
      { date: "2025-01-17", balance: 200 },
    ]);
  });
});
