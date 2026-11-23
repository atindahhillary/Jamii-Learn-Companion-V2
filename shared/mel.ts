// Monitoring, evaluation and learning (MEL): ground records exactly as collected, SMART indicators computed from them,
// advocacy tracking, and the numbers behind the impact dashboard. Pure functions so tests and any future server share them.
import { o, type T } from "./content.js";
import { BUCKETS, PRACTICES, regenScore } from "./impact.js";

/* ---------------- Ground records ---------------- */

export type Kind = "payout" | "household" | "land" | "practice" | "training";
export type Rec = { id: string; kind: Kind; date: string; village: string; collector: string; note: string; createdAt: string; sample?: boolean; v: Record<string, string | number> };
export type Field = { key: string; label: T; type: "text" | "number" | "select" | "yesno"; options?: [string, T][]; min?: number; max?: number; required?: boolean; hint?: T };

const yn: [string, T][] = [["yes", o("Ndiyo", "Yes")], ["no", o("Hapana", "No")]];
export const AUDIENCE_OPTS: [string, T][] = [["community", o("Jamii na kaya", "Community and households")], ["orgs", o("Mashirika na sera", "Organisations and policy")], ["schools", o("Shule", "Schools")], ["trainers", o("Wakufunzi", "Trainers")]];
const HH: Field = { key: "hh", label: o("Nambari ya kaya", "Household code"), type: "text", required: true, hint: o("Tumia nambari, si jina, kulinda faragha (mf. ENK-014)", "Use a code, not a name, to protect privacy (e.g. ENK-014)") };

export const KINDS: Record<Kind, { name: T; pillar: string; fields: Field[] }> = {
  payout: { name: o("Malipo kwa kaya", "Household payout"), pillar: "money", fields: [
    HH,
    { key: "kes", label: o("Kiasi kilichopokelewa (KES)", "Amount received (KES)"), type: "number", min: 0, max: 10_000_000, required: true },
    { key: "onTime", label: o("Kililipwa kwa wakati ulioahidiwa?", "Paid on the promised date?"), type: "yesno", options: yn, required: true },
    { key: "paidTo", label: o("Kililipwa kwa nani?", "Paid to whom?"), type: "select", required: true, options: [["joint", o("Majina mawili / pamoja", "Joint names")], ["woman", o("Mwanamke", "Woman")], ["man", o("Mwanaume", "Man")], ["other", o("Mwingine", "Other")]] },
    { key: "channel", label: o("Njia", "Channel"), type: "select", options: [["mpesa", o("M-Pesa", "M-Pesa")], ["bank", o("Benki", "Bank")], ["cash", o("Taslimu", "Cash")]] },
    { key: "use", label: o("Matumizi makuu", "Main use"), type: "select", options: BUCKETS.map((b) => [b.id, b.name] as [string, T]) },
  ] },
  household: { name: o("Utafiti wa kaya", "Household survey"), pillar: "change", fields: [
    HH,
    { key: "decides", label: o("Nani anaamua matumizi ya malipo?", "Who decides how the payout is used?"), type: "select", required: true, options: [["joint", o("Pamoja", "Together")], ["woman", o("Mwanamke", "Woman")], ["man", o("Mwanaume", "Man")], ["elder", o("Mzee wa familia", "Family elder")]] },
    { key: "hungry", label: o("Miezi ya njaa mwaka uliopita", "Hungry months in the last year"), type: "number", min: 0, max: 12, required: true },
    { key: "school", label: o("Watoto wote wa umri wa shule wako shuleni?", "All school-age children in school?"), type: "yesno", options: yn },
    { key: "savings", label: o("Kaya ina akiba (chama/benki)?", "Household has savings (chama/bank)?"), type: "yesno", options: yn },
    { key: "practices", label: o("Mazoea bora yanayotumika", "Better practices in use"), type: "number", min: 0, max: 8 },
  ] },
  land: { name: o("Kipimo cha ardhi", "Land check"), pillar: "regen", fields: [
    HH,
    { key: "grass", label: o("Nyasi %", "Grass cover %"), type: "number", min: 0, max: 100, required: true },
    { key: "bare", label: o("Ardhi tupu %", "Bare ground %"), type: "number", min: 0, max: 100, required: true },
    { key: "trees", label: o("Miti hai", "Living trees"), type: "number", min: 0, max: 10000 },
    { key: "worms", label: o("Minyoo kwenye jembe", "Worms per spade"), type: "number", min: 0, max: 500 },
    { key: "soak", label: o("Sekunde za maji kuingia", "Seconds for water to soak in"), type: "number", min: 0, max: 3600 },
  ] },
  practice: { name: o("Mazoea ya kilimo bora", "Clever farming practice"), pillar: "farming", fields: [
    HH,
    { key: "practice", label: o("Mazoea", "Practice"), type: "select", required: true, options: PRACTICES.map((p) => [p.id, p.name] as [string, T]) },
    { key: "acres", label: o("Ekari", "Acres"), type: "number", min: 0, max: 100000 },
    { key: "status", label: o("Hali", "Status"), type: "select", required: true, options: [["planned", o("Imepangwa", "Planned")], ["started", o("Imeanza", "Started")], ["established", o("Imeimarika", "Established")]] },
  ] },
  training: { name: o("Mafunzo / kufikia watu", "Training / outreach"), pillar: "pathways", fields: [
    { key: "audience", label: o("Kundi", "Audience"), type: "select", required: true, options: AUDIENCE_OPTS },
    { key: "topic", label: o("Mada", "Topic"), type: "select", options: [["money", o("Njia ya pesa", "Money trail")], ["change", o("Mabadiliko ya kaya", "Household change")], ["economics", o("Uchumi", "Economics")], ["regen", o("Urejeshaji", "Regeneration")], ["farming", o("Kilimo bora", "Clever farming")], ["rights", o("Haki na mikataba", "Rights and agreements")]] },
    { key: "women", label: o("Wanawake", "Women"), type: "number", min: 0, max: 5000, required: true },
    { key: "men", label: o("Wanaume", "Men"), type: "number", min: 0, max: 5000, required: true },
    { key: "youth", label: o("Kati yao, vijana", "Of whom youth"), type: "number", min: 0, max: 5000 },
  ] },
};

// Trust boundary: records typed in or imported from another phone are checked field by field.
export function checkRecord(r: unknown): { ok: true; rec: Rec } | { ok: false; why: string } {
  const x = r as Rec;
  if (!x || typeof x !== "object" || !(x.kind in KINDS)) return { ok: false, why: "kind" };
  if (typeof x.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x.date) || isNaN(Date.parse(x.date))) return { ok: false, why: "date" };
  const v: Record<string, string | number> = {};
  for (const f of KINDS[x.kind].fields) {
    const raw = x.v?.[f.key];
    if (raw === undefined || raw === "") { if (f.required) return { ok: false, why: f.key }; continue; }
    if (f.type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max)) return { ok: false, why: f.key };
      v[f.key] = n;
    } else {
      const s = String(raw).slice(0, 80);
      if (f.options && !f.options.some(([k]) => k === s)) return { ok: false, why: f.key };
      v[f.key] = s;
    }
  }
  const s = (y: unknown, n: number) => (typeof y === "string" ? y.slice(0, n) : "");
  const id = s(x.id, 40) || `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { ok: true, rec: { id, kind: x.kind, date: x.date, village: s(x.village, 60), collector: s(x.collector, 60), note: s(x.note, 500), createdAt: s(x.createdAt, 30) || new Date().toISOString(), v } };
}

// Merge records from another device; same id never counts twice.
export function merge(mine: Rec[], incoming: unknown[]) {
  const seen = new Set(mine.map((r) => r.id));
  const added: Rec[] = []; let bad = 0;
  for (const r of incoming) { const c = checkRecord(r); if (!c.ok) { bad++; continue; } if (!seen.has(c.rec.id)) { seen.add(c.rec.id); added.push(c.rec); } }
  return { all: [...mine, ...added], added: added.length, dupes: incoming.length - added.length - bad, bad };
}

/* ---------------- Metrics ---------------- */

const n = (x: unknown) => Number(x) || 0;
const inRange = (r: Rec, from: string, to: string) => r.date >= from && r.date < to;
const pct = (a: number, b: number) => (b ? Math.round(a / b * 100) : 0);
const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0);
const landScore = (r: Rec) => regenScore({ grass: n(r.v.grass), bare: n(r.v.bare), trees: n(r.v.trees), worms: n(r.v.worms), soakSec: n(r.v.soak) || 300 });

export type MetricKey = "paid" | "onTime" | "womenJoint" | "households" | "jointDecide" | "hungry" | "regen" | "practices" | "acres" | "reached" | "womenReached" | "wins";
export const METRICS: Record<MetricKey, { name: T; unit: string; pillar: string; better: "up" | "down" }> = {
  paid: { name: o("Pesa iliyofika kwa kaya", "Paid to households"), unit: "KES", pillar: "money", better: "up" },
  onTime: { name: o("Malipo kwa wakati", "Payments on time"), unit: "%", pillar: "money", better: "up" },
  womenJoint: { name: o("Malipo kwa mwanamke au pamoja", "Paid to women or jointly"), unit: "%", pillar: "change", better: "up" },
  households: { name: o("Kaya zilizofikiwa", "Households reached"), unit: "", pillar: "change", better: "up" },
  jointDecide: { name: o("Kaya zinazoamua pamoja", "Households deciding jointly"), unit: "%", pillar: "change", better: "up" },
  hungry: { name: o("Wastani wa miezi ya njaa", "Average hungry months"), unit: "mo", pillar: "economics", better: "down" },
  regen: { name: o("Alama ya urejeshaji", "Regeneration score"), unit: "/100", pillar: "regen", better: "up" },
  practices: { name: o("Mazoea yaliyoimarika", "Practices established"), unit: "", pillar: "farming", better: "up" },
  acres: { name: o("Ekari chini ya kilimo bora", "Acres under clever farming"), unit: "ac", pillar: "farming", better: "up" },
  reached: { name: o("Watu waliofundishwa", "People trained"), unit: "", pillar: "pathways", better: "up" },
  womenReached: { name: o("Wanawake kati ya waliofundishwa", "Women among those trained"), unit: "%", pillar: "pathways", better: "up" },
  wins: { name: o("Ushindi wa sera", "Policy wins"), unit: "", pillar: "advocacy", better: "up" },
};

export function metric(key: MetricKey, recs: Rec[], issues: Issue[] = []): number {
  const k = (kind: Kind) => recs.filter((r) => r.kind === kind);
  switch (key) {
    case "paid": return k("payout").reduce((s, r) => s + n(r.v.kes), 0);
    case "onTime": { const p = k("payout"); return pct(p.filter((r) => r.v.onTime === "yes").length, p.length); }
    case "womenJoint": { const p = k("payout"); return pct(p.filter((r) => r.v.paidTo === "woman" || r.v.paidTo === "joint").length, p.length); }
    case "households": return new Set(recs.filter((r) => r.v.hh).map((r) => `${r.village}|${r.v.hh}`)).size;
    case "jointDecide": { const h = k("household"); return pct(h.filter((r) => r.v.decides === "joint").length, h.length); }
    case "hungry": { const h = k("household"); return h.length ? +(h.reduce((s, r) => s + n(r.v.hungry), 0) / h.length).toFixed(1) : 0; }
    case "regen": return avg(k("land").map(landScore));
    case "practices": return k("practice").filter((r) => r.v.status === "established").length;
    case "acres": return Math.round(k("practice").filter((r) => r.v.status !== "planned").reduce((s, r) => s + n(r.v.acres), 0));
    case "reached": return k("training").reduce((s, r) => s + n(r.v.women) + n(r.v.men), 0);
    case "womenReached": { const t = k("training"); const w = t.reduce((s, r) => s + n(r.v.women), 0); return pct(w, t.reduce((s, r) => s + n(r.v.women) + n(r.v.men), 0)); }
    case "wins": return issues.filter((i) => i.stage >= 4).length;
  }
}

// Quarter windows so every KPI can show "vs last quarter".
export function quarters(today = new Date()) {
  const q = Math.floor(today.getMonth() / 3), y = today.getFullYear();
  const d = (yy: number, m: number) => new Date(Date.UTC(yy, m, 1)).toISOString().slice(0, 10);
  return { now: [d(y, q * 3), d(y, q * 3 + 3)] as const, prev: [d(y, q * 3 - 3), d(y, q * 3)] as const };
}
export function kpi(key: MetricKey, recs: Rec[], issues: Issue[] = [], today = new Date()) {
  const { now, prev } = quarters(today);
  const total = metric(key, recs, issues);
  const cur = metric(key, recs.filter((r) => inRange(r, ...now)), issues);
  const was = metric(key, recs.filter((r) => inRange(r, ...prev)), issues);
  const change = was ? Math.round((cur - was) / Math.abs(was) * 1000) / 10 : null;
  return { total, cur, was, change };
}
export const months = (today = new Date(), count = 12) => Array.from({ length: count }, (_, i) => new Date(Date.UTC(today.getFullYear(), today.getMonth() - count + 1 + i, 1)).toISOString().slice(0, 7));
// Rates and averages carry the last known value through months with no records, instead of falling to 0.
const SOURCE_KIND: Partial<Record<MetricKey, Kind>> = { onTime: "payout", womenJoint: "payout", jointDecide: "household", hungry: "household", regen: "land", womenReached: "training" };
export function byMonth(key: MetricKey, recs: Rec[], ms: string[]) {
  const kind = SOURCE_KIND[key];
  let last: number | null = null;
  const vals = ms.map((m) => {
    const inMonth = recs.filter((r) => r.date.startsWith(m));
    if (kind && !inMonth.some((r) => r.kind === kind)) return last;
    return (last = metric(key, inMonth));
  });
  const first = vals.find((x) => x != null) ?? 0;
  return vals.map((x) => x ?? first);
}
export function breakdown(recs: Rec[], kind: Kind, field: string, weigh: (r: Rec) => number = () => 1) {
  const out: Record<string, number> = {};
  for (const r of recs) if (r.kind === kind && r.v[field] != null) out[String(r.v[field])] = (out[String(r.v[field])] ?? 0) + weigh(r);
  return out;
}
export const people = (r: Rec) => n(r.v.women) + n(r.v.men);
export const acresOf = (r: Rec) => n(r.v.acres);

/* ---------------- SMART indicators ---------------- */

export type Indicator = { id: string; pillar: string; name: T; metric: MetricKey; baseline: number; target: number; due: string; source: T; frequency: T; owner: string };
export const DEFAULT_INDICATORS: Indicator[] = [
  { id: "i-ontime", pillar: "money", metric: "onTime", name: o("90% ya malipo ya kaya yanafika kwa wakati ulioahidiwa ifikapo Desemba 2027", "90% of household payouts arrive on the promised date by December 2027"), baseline: 55, target: 90, due: "2027-12-31", source: o("Fomu ya malipo kwa kaya", "Household payout form"), frequency: o("Kila malipo", "Every payment"), owner: "CDA treasurer" },
  { id: "i-paid", pillar: "money", metric: "paid", name: o("KES milioni 2 zinafika moja kwa moja kwa kaya ifikapo Juni 2027", "KES 2 million reaches households directly by June 2027"), baseline: 0, target: 2_000_000, due: "2027-06-30", source: o("Fomu ya malipo kwa kaya", "Household payout form"), frequency: o("Kila malipo", "Every payment"), owner: "CDA committee" },
  { id: "i-women", pillar: "change", metric: "womenJoint", name: o("60% ya malipo yanalipwa kwa mwanamke au kwa majina mawili ifikapo Desemba 2027", "60% of payouts go to a woman or joint names by December 2027"), baseline: 20, target: 60, due: "2027-12-31", source: o("Fomu ya malipo kwa kaya", "Household payout form"), frequency: o("Kila robo", "Quarterly"), owner: "Gender lead" },
  { id: "i-joint", pillar: "change", metric: "jointDecide", name: o("70% ya kaya zinaamua pamoja matumizi ya malipo ifikapo Desemba 2027", "70% of households decide payout use together by December 2027"), baseline: 30, target: 70, due: "2027-12-31", source: o("Utafiti wa kaya", "Household survey"), frequency: o("Kila miezi 6", "Every 6 months"), owner: "M&E officer" },
  { id: "i-hungry", pillar: "economics", metric: "hungry", name: o("Miezi ya njaa inashuka hadi 1 kwa kaya ifikapo Desemba 2028", "Hungry months fall to 1 per household by December 2028"), baseline: 4, target: 1, due: "2028-12-31", source: o("Utafiti wa kaya", "Household survey"), frequency: o("Kila mwaka", "Yearly"), owner: "M&E officer" },
  { id: "i-regen", pillar: "regen", metric: "regen", name: o("Alama ya wastani ya urejeshaji inafika 65 ifikapo Desemba 2028", "Average regeneration score reaches 65 by December 2028"), baseline: 40, target: 65, due: "2028-12-31", source: o("Kipimo cha ardhi", "Land check"), frequency: o("Kila msimu", "Every season"), owner: "Land monitors" },
  { id: "i-practice", pillar: "farming", metric: "practices", name: o("Mazoea 150 ya kilimo bora yameimarika ifikapo Desemba 2027", "150 clever farming practices established by December 2027"), baseline: 0, target: 150, due: "2027-12-31", source: o("Fomu ya mazoea", "Practice form"), frequency: o("Kila msimu", "Every season"), owner: "Extension lead" },
  { id: "i-reach", pillar: "pathways", metric: "reached", name: o("Watu 2,000 wamefundishwa katika makundi manne ifikapo Desemba 2027", "2,000 people trained across the four audiences by December 2027"), baseline: 0, target: 2000, due: "2027-12-31", source: o("Fomu ya mafunzo", "Training form"), frequency: o("Kila kikao", "Every session"), owner: "Training lead" },
  { id: "i-womenreach", pillar: "pathways", metric: "womenReached", name: o("Angalau 50% ya waliofundishwa ni wanawake kila robo", "At least 50% of people trained are women, every quarter"), baseline: 35, target: 50, due: "2027-12-31", source: o("Fomu ya mafunzo", "Training form"), frequency: o("Kila robo", "Quarterly"), owner: "Training lead" },
  { id: "i-wins", pillar: "advocacy", metric: "wins", name: o("Ahadi 3 za sera zinapatikana kutoka kaunti au kamati ya CDA ifikapo Desemba 2027", "3 policy commitments won from the county or CDA committee by December 2027"), baseline: 0, target: 3, due: "2027-12-31", source: o("Kifuatiliaji cha utetezi", "Advocacy tracker"), frequency: o("Kila mwezi", "Monthly"), owner: "Advocacy lead" },
];

// Which SMART letters an indicator meets, so weak ones are visible.
export function smart(i: Pick<Indicator, "name" | "metric" | "baseline" | "target" | "due" | "owner" | "pillar">, today = new Date()) {
  const hasNum = /\d/.test(i.name.en + i.name.sw);
  return {
    S: i.name.en.trim().length >= 20 && !!i.pillar,
    M: i.metric in METRICS && Number.isFinite(i.target) && i.target !== i.baseline,
    A: !!i.owner.trim() && (METRICS[i.metric]?.unit !== "%" || (i.target >= 0 && i.target <= 100)),
    R: !!i.pillar && METRICS[i.metric]?.pillar === i.pillar,
    T: /^\d{4}-\d{2}-\d{2}$/.test(i.due) && new Date(i.due) > today && hasNum,
  };
}
// 0-100 progress from baseline towards target; works when lower is better too.
export const progress = (i: Indicator, value: number) => {
  const span = i.target - i.baseline;
  return span === 0 ? 0 : Math.max(0, Math.min(100, Math.round((value - i.baseline) / span * 100)));
};

/* ---------------- Policy advocacy ---------------- */

export const STAGES: T[] = [o("Kutambua tatizo", "Issue identified"), o("Ushahidi umekusanywa", "Evidence gathered"), o("Mazungumzo na watoa uamuzi", "Decision makers engaged"), o("Wameweka kwenye ajenda", "On the agenda"), o("Ahadi imetolewa", "Commitment made"), o("Sera / uamuzi umebadilika", "Policy or decision changed"), o("Inatekelezwa", "Being implemented")];
export const LEVELS: [string, T][] = [["cda", o("Kamati ya CDA", "CDA committee")], ["ward", o("Wadi", "Ward")], ["county", o("Kaunti", "County")], ["national", o("Taifa", "National")]];
export type Issue = { id: string; title: string; level: string; target: string; ask: string; evidence: string[]; stage: number; next: string; updated: string; log: { date: string; stage: number; note: string }[] };
export const SAMPLE_ISSUES: Issue[] = [
  { id: "a1", title: "Annual earnings report read out at the community assembly", level: "cda", target: "CDA committee chair", ask: "Publish and read out the yearly earnings and cost report, as the CDA requires", evidence: ["i-paid", "i-ontime"], stage: 4, next: "Agree the date of the first public reading", updated: "2026-10-14", log: [] },
  { id: "a2", title: "Joint-name household payments", level: "cda", target: "CDA committee", ask: "Pay households into joint names by default", evidence: ["i-women", "i-joint"], stage: 2, next: "Share the payout data by gender at the next meeting", updated: "2026-11-02", log: [] },
  { id: "a3", title: "County budget line for community land monitors", level: "county", target: "County environment committee", ask: "Fund 20 youth land monitors in the next budget", evidence: ["i-regen", "i-practice"], stage: 1, next: "Write a one-page brief from the land monitor data", updated: "2026-11-10", log: [] },
];
export const stageCounts = (issues: Issue[]) => STAGES.map((_, s) => issues.filter((i) => i.stage === s).length);

/* ---------------- Sample data (fictional, for the demo) ---------------- */

export function sampleRecords(today = new Date(), seed = 7): Rec[] {
  let x = seed; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pickOne = <V,>(a: V[]) => a[Math.floor(rnd() * a.length)];
  const villages = ["Enkare", "Olkeri", "Naretoi", "Sekenani", "Oloosuyian"];
  const out: Rec[] = [];
  const day = (monthsAgo: number) => { const d = new Date(Date.UTC(today.getFullYear(), today.getMonth() - monthsAgo, 1 + Math.floor(rnd() * 27))); return d > today ? today.toISOString().slice(0, 10) : d.toISOString().slice(0, 10); };
  const add = (kind: Kind, monthsAgo: number, v: Rec["v"]) => out.push({ id: `s${out.length}`, kind, date: day(monthsAgo), village: pickOne(villages), collector: "Sample", note: "", createdAt: "", sample: true, v });
  for (let m = 11; m >= 0; m--) {
    const t = (11 - m) / 11; // things improve over the year
    if (m % 3 === 0) for (let h = 0; h < 40; h++) add("payout", m, { hh: `HH-${h}`, kes: Math.round(3000 + rnd() * 1500), onTime: rnd() < 0.5 + t * 0.4 ? "yes" : "no", paidTo: rnd() < 0.2 + t * 0.4 ? pickOne(["joint", "woman"]) : "man", channel: rnd() < 0.85 ? "mpesa" : "bank", use: pickOne(BUCKETS.map((b) => b.id)) });
    if (m % 6 === 0) for (let h = 0; h < 30; h++) add("household", m, { hh: `HH-${h}`, decides: rnd() < 0.3 + t * 0.35 ? "joint" : pickOne(["man", "woman", "elder"]), hungry: Math.max(0, Math.round(4 - t * 2 + (rnd() - 0.5) * 2)), school: rnd() < 0.7 + t * 0.2 ? "yes" : "no", savings: rnd() < 0.3 + t * 0.3 ? "yes" : "no", practices: Math.round(t * 3 + rnd() * 2) });
    for (let p = 0; p < 6; p++) add("land", m, { hh: `HH-${p * 5}`, grass: Math.round(35 + t * 25 + (rnd() - 0.5) * 16), bare: Math.round(35 - t * 18 + (rnd() - 0.5) * 10), trees: Math.round(3 + t * 6 + rnd() * 3), worms: Math.round(1 + t * 4 + rnd() * 2), soak: Math.round(200 - t * 110 + rnd() * 40) });
    for (let p = 0; p < 8; p++) add("practice", m, { hh: `HH-${Math.floor(rnd() * 40)}`, practice: pickOne(PRACTICES.map((q) => q.id)), acres: Math.round(1 + rnd() * 6), status: rnd() < 0.3 + t * 0.4 ? "established" : rnd() < 0.6 ? "started" : "planned" });
    for (let s = 0; s < 3; s++) { const total = Math.round(20 + rnd() * 40); const women = Math.round(total * (0.35 + t * 0.2 + (rnd() - 0.5) * 0.1)); add("training", m, { audience: pickOne(["community", "community", "schools", "orgs", "trainers"]), topic: pickOne(["money", "change", "regen", "farming", "rights", "economics"]), women, men: total - women, youth: Math.round(total * 0.3) }); }
  }
  return out;
}

/* ---------------- Export ---------------- */

export function toCsv(recs: Rec[]) {
  const keys = [...new Set(Object.values(KINDS).flatMap((k) => k.fields.map((f) => f.key)))];
  const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  return [["id", "kind", "date", "village", "collector", ...keys, "note"].join(","), ...recs.map((r) => [r.id, r.kind, r.date, r.village, r.collector, ...keys.map((k) => r.v[k] ?? ""), r.note].map(esc).join(","))].join("\n");
}
