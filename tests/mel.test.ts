import { describe, expect, it } from "vitest";
import { DEFAULT_INDICATORS, SAMPLE_ISSUES, checkRecord, kpi, merge, metric, progress, quarters, sampleRecords, smart, toCsv } from "../shared/mel";

const today = new Date("2026-11-23T12:00:00Z");
const rec = (v: Record<string, unknown>, kind = "payout", date = "2026-11-02") => ({ id: "", kind, date, village: "Enkare", collector: "me", note: "", createdAt: "", v });

describe("ground records", () => {
  it("accepts a valid payout and rejects bad input from another phone", () => {
    expect(checkRecord(rec({ hh: "ENK-1", kes: "3500", onTime: "yes", paidTo: "joint" })).ok).toBe(true);
    expect(checkRecord(rec({ hh: "ENK-1", kes: -5, onTime: "yes", paidTo: "joint" })).ok).toBe(false);   // negative money
    expect(checkRecord(rec({ hh: "ENK-1", kes: 10, onTime: "maybe", paidTo: "joint" })).ok).toBe(false); // not an option
    expect(checkRecord(rec({ kes: 10, onTime: "yes", paidTo: "joint" })).ok).toBe(false);                // missing household
    expect(checkRecord({ ...rec({}), kind: "hack" }).ok).toBe(false);
    expect(checkRecord(rec({ hh: "x", kes: 1, onTime: "yes", paidTo: "man" }, "payout", "2026-13-40")).ok).toBe(false);
  });
  it("merging the same file twice adds nothing the second time", () => {
    const file = [{ ...rec({ hh: "A", kes: 100, onTime: "yes", paidTo: "man" }), id: "x1" }, { ...rec({ hh: "B", kes: 200, onTime: "no", paidTo: "woman" }), id: "x2" }, { bad: true }];
    const once = merge([], file);
    expect(once.added).toBe(2); expect(once.bad).toBe(1);
    expect(merge(once.all, file).added).toBe(0);
  });
  it("exports every record to CSV with a header", () => {
    expect(toCsv(sampleRecords(today)).split("\n").length).toBe(sampleRecords(today).length + 1);
  });
});

describe("metrics and dashboard numbers", () => {
  const recs = [rec({ hh: "A", kes: 1000, onTime: "yes", paidTo: "joint" }), rec({ hh: "B", kes: 3000, onTime: "no", paidTo: "man" })].map((r) => checkRecord(r)).map((c) => (c.ok ? c.rec : null)!);
  it("adds money and percentages correctly", () => {
    expect(metric("paid", recs)).toBe(4000);
    expect(metric("onTime", recs)).toBe(50);
    expect(metric("womenJoint", recs)).toBe(50);
    expect(metric("households", recs)).toBe(2);
    expect(metric("wins", [], SAMPLE_ISSUES)).toBe(1);
  });
  it("compares this quarter with last quarter", () => {
    expect(quarters(today)).toEqual({ now: ["2026-10-01", "2027-01-01"], prev: ["2026-07-01", "2026-10-01"] });
    const k = kpi("paid", [...recs, ...[rec({ hh: "C", kes: 2000, onTime: "yes", paidTo: "man" }, "payout", "2026-08-10")].map((r) => (checkRecord(r) as any).rec)], [], today);
    expect(k).toEqual({ total: 6000, cur: 4000, was: 2000, change: 100 });
  });
  it("sample data shows improvement over the year", () => {
    const s = sampleRecords(today);
    const early = s.filter((r) => r.date < "2026-04-01"), late = s.filter((r) => r.date >= "2026-09-01");
    expect(metric("regen", late)).toBeGreaterThan(metric("regen", early));
  });
});

describe("SMART indicators", () => {
  it("every default indicator meets all five letters", () => {
    for (const i of DEFAULT_INDICATORS) expect(Object.values(smart(i, today)).every(Boolean), i.id).toBe(true);
  });
  it("flags a vague indicator", () => {
    const s = smart({ name: { sw: "Bora", en: "Better" }, metric: "paid", baseline: 0, target: 0, due: "2020-01-01", owner: "", pillar: "change" }, today);
    expect(s).toEqual({ S: false, M: false, A: false, R: false, T: false });
  });
  it("progress works whether higher or lower is better", () => {
    const hungry = DEFAULT_INDICATORS.find((i) => i.id === "i-hungry")!; // baseline 4, target 1
    expect(progress(hungry, 2.5)).toBe(50);
    expect(progress(DEFAULT_INDICATORS[0], 90)).toBe(100);
  });
});

describe("monthly trend", async () => {
  const { byMonth } = await import("../shared/mel");
  it("carries a rate through months with no records instead of dropping to 0", () => {
    const r = (date: string, onTime: string) => (checkRecord({ id: date, kind: "payout", date, village: "", collector: "", note: "", createdAt: "", v: { hh: "A", kes: 1, onTime, paidTo: "man" } }) as any).rec;
    expect(byMonth("onTime", [r("2026-01-05", "yes"), r("2026-03-05", "no")], ["2026-01", "2026-02", "2026-03"])).toEqual([100, 100, 0]);
    expect(byMonth("paid", [r("2026-01-05", "yes")], ["2026-01", "2026-02"])).toEqual([1, 0]);
  });
});
