import { describe, expect, it } from "vitest";
import { BUCKETS, ECON_EXAMPLE, GAPS, LEDGER_EXAMPLE, PRACTICES, TABS, TOC, YEARS, econ, ledger, perHouseholdCost, regenScore, regenTrend, smooth, spread, splitAdvice } from "../shared/impact";

describe("money trail", () => {
  it("accounts for every shilling", () => {
    const l = ledger(LEDGER_EXAMPLE);
    expect(l.costs + l.community + l.developer).toBe(l.gross);
    expect(l.reserve + l.projects + l.committee + l.households).toBe(l.community);
    expect(l.warnings).toHaveLength(0);
  });
  it("applies reg 29 to earnings after costs, 40% land and 25% not", () => {
    const base = { ...LEDGER_EXAMPLE, tonnes: 1000, bufferPct: 0, priceUsd: 10, fx: 100, brokerPct: 0, verifyKes: 200_000, opsKes: 400_000 };
    expect(ledger(base).community).toBe(160_000);               // (1m - 0.6m) * 40%
    expect(ledger({ ...base, landBased: false }).community).toBe(100_000);
  });
  it("warns when costs swallow the sale or the split is off", () => {
    const l = ledger({ ...LEDGER_EXAMPLE, opsKes: 999_999_999, split: { reserve: 10, projects: 10, committee: 10, households: 10 } });
    expect(l.community).toBe(0);
    expect(l.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe("reliable payouts", () => {
  const pots = YEARS.map((y) => 100_000 * y.factor);
  it("never loses money: paid plus reserve equals what came in", () => {
    const s = smooth(pots, 15);
    expect(Math.abs(s.paid.reduce((a, b) => a + b, 0) + s.reserve - pots.reduce((a, b) => a + b, 0))).toBeLessThanOrEqual(5);
  });
  it("narrows the gap between the best and worst year", () => {
    expect(spread(smooth(pots, 20).paid)).toBeLessThan(spread(pots));
  });
});

describe("household change and economics", () => {
  it("has a full chain and advice for any split", () => {
    expect(TOC.length).toBeGreaterThanOrEqual(6);
    expect(splitAdvice({ food: 100 }).length).toBeGreaterThan(0);
    const even = Object.fromEntries(BUCKETS.map((b) => [b.id, 1]));
    expect(splitAdvice(even)[0].en).toMatch(/balanced/);
  });
  it("finds break-even, NPV and a local multiplier", () => {
    const e = econ(ECON_EXAMPLE);
    expect(e.rows).toHaveLength(ECON_EXAMPLE.years);
    expect(e.breakEven).not.toBeNull();
    expect(e.multiplier).toBeGreaterThan(1);
    expect(econ({ ...ECON_EXAMPLE, payout: 0, newIncome: 0 }).breakEven).toBeNull();
  });
  it("shared costs fall per household as more join", () => {
    expect(perHouseholdCost(600_000, 200, 600)).toBeLessThan(perHouseholdCost(600_000, 200, 60));
  });
});

describe("land monitor", () => {
  it("scores healthy land above degraded land, within 0-100", () => {
    const good = regenScore({ grass: 80, bare: 5, trees: 20, worms: 10, soakSec: 20 });
    const poor = regenScore({ grass: 10, bare: 70, trees: 0, worms: 0, soakSec: 400 });
    expect(good).toBeGreaterThan(poor);
    expect(good).toBeLessThanOrEqual(100);
    expect(poor).toBeGreaterThanOrEqual(0);
  });
  it("raises alerts when bare ground jumps or trees are lost", () => {
    const base = { id: "a", season: "", photo: false, note: "", worms: 3, soakSec: 60 };
    const t = regenTrend([{ ...base, date: "2026-03-01", grass: 60, bare: 10, trees: 8 }, { ...base, id: "b", date: "2026-07-01", grass: 25, bare: 30, trees: 5 }]);
    expect(t.change).toBeLessThan(0);
    expect(t.alerts).toHaveLength(3);
  });
});

describe("content", () => {
  it("every gap points to a real tab and every practice has a season", () => {
    for (const g of GAPS) expect(TABS).toContain(g.tab);
    for (const p of PRACTICES) expect(p.when.length).toBeGreaterThan(0);
  });
});

describe("Rotate the Herd", async () => {
  const { graze } = await import("../src/brickgames");
  it("grazed paddock loses grass, rested ones grow, drought stops growth", () => {
    expect(graze([4, 4, 4, 4], 0, false)).toEqual({ grass: [1, 5, 5, 5], fed: true });
    expect(graze([2, 6, 4, 4], 0, true)).toEqual({ grass: [0, 6, 4, 4], fed: false });
  });
});
