import { AlertTriangle, ArrowRight, ClipboardList, Coins, Download, HeartHandshake, Layers, LayoutDashboard, Megaphone, Plus, Route, Sprout, Target, Trash2, TrendingUp, Wheat } from "lucide-react";
import { Advocacy, Collect, Dashboard, Indicators } from "./mel";
import { useEffect, useState } from "react";
import type { T } from "../shared/content";
import {
  BUCKETS, CBE_LINKS, ECON_EXAMPLE, GAPS, LEDGER_EXAMPLE, METHODS, PATHS, PRACTICES, SEASONS, TABS, TAB_NAMES, TOC, YEARS,
  econ, ledger, perHouseholdCost, regenScore, regenTrend, smooth, spread, splitAdvice, type Check, type Econ, type Ledger, type Tab,
} from "../shared/impact";
import { AreaChart } from "./charts";
import { Person } from "./avatars";
import { Listen } from "./audio";
import { useL, useT } from "./core";

// shortcut: everything on this page is saved on this device only; move to the API when the database is switched on.
function useStored<V>(key: string, init: V): [V, (v: V) => void] {
  const [v, setV] = useState<V>(() => { try { const s = localStorage.getItem(key); return s ? { ...init, ...JSON.parse(s) } : init; } catch { return init; } });
  const save = (x: V) => { setV(x); try { localStorage.setItem(key, JSON.stringify(x)); } catch { /* not remembered */ } };
  return [v, save];
}
function useList<V>(key: string): [V[], (v: V[]) => void] {
  const [v, setV] = useState<V[]>(() => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } });
  return [v, (x) => { setV(x); try { localStorage.setItem(key, JSON.stringify(x)); } catch { /* not remembered */ } }];
}

const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const ICONS: Record<Tab, typeof Coins> = { overview: Layers, money: Coins, change: HeartHandshake, economics: TrendingUp, pathways: Route, regen: Sprout, farming: Wheat };
const HOSTS: Record<Tab, [string, T]> = {
  overview: ["elder", { sw: "Haya ni mambo sita ambayo wataalamu walisema lazima tuyaunganishe. Kila moja lina zana yake hapa.", en: "These are the six things the experts said must work together. Each one has its own tool here." }],
  money: ["bibi", { sw: "Fuata kila shilingi. Badilisha namba zilizo hapa chini kwa namba za mradi wenu.", en: "Follow every shilling. Change the numbers below to your project's numbers." }],
  change: ["mama", { sw: "Mabadiliko yanaanzia ndani ya nyumba. Tuone jinsi kujifunza kunavyokuwa ustawi wa kaya.", en: "Change starts inside the home. See how learning becomes household wellbeing." }],
  economics: ["moran", { sw: "Je, inafaa? Linganisha unachopata na unachopoteza kwa miaka kumi.", en: "Is it worth it? Compare what you gain and what you give up over ten years." }],
  pathways: ["mwalimu", { sw: "Maarifa lazima yafike kwa kila mtu: jamii, mashirika, shule na wakufunzi.", en: "Knowledge must reach everyone: community, organisations, schools and trainers." }],
  regen: ["kijana", { sw: "Pima kipande kimoja cha ardhi kila msimu kwa zana rahisi: kijiti, jembe na kikombe cha maji.", en: "Monitor one plot every season with simple tools: a stick, a spade and a cup of water." }],
  farming: ["dada", { sw: "Kilimo bora kinarudisha ardhi na kuongeza mapato. Chagua msimu uone cha kufanya.", en: "Clever farming restores land and adds income. Pick a season to see what to do." }],
};

// Impact opens on the dashboard; MEL tools sit beside it; the six pillar tools are one level down.
const MAIN = ["dashboard", "collect", "indicators", "advocacy", "tools"] as const;
type Main = (typeof MAIN)[number];
const MAIN_ICONS: Record<Main, typeof Coins> = { dashboard: LayoutDashboard, collect: ClipboardList, indicators: Target, advocacy: Megaphone, tools: Layers };

export function Impact() {
  const L = useL(), Tx = useT();
  const seg = () => location.hash.split("/")[1] ?? "";
  const mainOf = (s: string): Main => (TABS.includes(s as Tab) ? "tools" : MAIN.includes(s as Main) ? (s as Main) : "dashboard");
  const tabOf = (s: string): Tab => (TABS.includes(s as Tab) ? (s as Tab) : "overview");
  const [s, setS] = useState(seg);
  useEffect(() => { const f = () => setS(seg()); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  const open = (t: string) => { location.hash = `impact/${t}`; window.scrollTo(0, 0); };
  const main = mainOf(s), tab = tabOf(s);
  const [look, say] = HOSTS[tab];
  const MAIN_NAMES: Record<Main, string> = { dashboard: L("Dashibodi", "Dashboard"), collect: L("Kusanya data", "Collect data"), indicators: L("Viashiria SMART", "SMART indicators"), advocacy: L("Utetezi wa sera", "Policy advocacy"), tools: L("Zana za nguzo", "Pillar tools") };
  return (
    <div className="page">
      <h1>{main === "dashboard" ? L("Dashibodi ya athari", "Impact dashboard") : L("Athari: kutoka maarifa hadi ustawi", "Impact: from knowledge to wellbeing")}</h1>
      {main === "dashboard" && <p className="muted lead">{L("Pesa, kaya, ardhi, kilimo, maarifa na sera: kila nguzo kutoka data ya ardhini.", "Money, households, land, farming, knowledge and policy: every pillar, from ground data.")}</p>}
      <div className="tabs" role="tablist" aria-label={L("Sehemu za athari", "Impact sections")}>
        {MAIN.map((t) => { const I = MAIN_ICONS[t]; return <button key={t} role="tab" aria-selected={main === t} onClick={() => open(t === "tools" ? "overview" : t)}><I size={15} aria-hidden /> {MAIN_NAMES[t]}</button>; })}
      </div>
      {main === "dashboard" && <Dashboard open={open} />}
      {main === "collect" && <Collect />}
      {main === "indicators" && <Indicators />}
      {main === "advocacy" && <Advocacy />}
      {main === "tools" && <>
      <div className="tabs sub" role="tablist" aria-label={L("Nguzo sita", "Six pillars")}>
        {TABS.map((t) => { const I = ICONS[t]; return <button key={t} role="tab" aria-selected={tab === t} onClick={() => open(t)}><I size={15} aria-hidden /> {Tx(TAB_NAMES[t])}</button>; })}
      </div>
      <div className="line-row guide lead"><Person look={look} size={52} /><div className="bubble"><p>{Tx(say)}</p><Listen text={Tx(say)} /></div></div>
      {tab === "overview" && <Overview open={open} />}
      {tab === "money" && <Money />}
      {tab === "change" && <Change />}
      {tab === "economics" && <Economics />}
      {tab === "pathways" && <Pathways open={open} />}
      {tab === "regen" && <Regen />}
      {tab === "farming" && <Farming />}
      </>}
      <p className="muted small note">{L("Data ya mfano ni ya kubuni. Hii si ushauri wa kifedha wala wa kisheria. Unachoandika kinabaki kwenye kifaa hiki hadi ukishiriki faili.", "Sample data is fictional. This is not financial or legal advice. What you enter stays on this device until you share a file.")}</p>
    </div>
  );
}

/* ---------- The whole picture ---------- */
const LOOP: [Tab, T][] = [
  ["pathways", { sw: "Maarifa", en: "Knowledge" }], ["farming", { sw: "Mazoea bora", en: "Better practice" }], ["regen", { sw: "Ardhi hai", en: "Living land" }],
  ["money", { sw: "Mikopo na pesa", en: "Credits and money" }], ["change", { sw: "Kaya inastawi", en: "Household thrives" }], ["economics", { sw: "Inafaa kuendelea", en: "Worth continuing" }],
];
function Overview({ open }: { open: (t: string) => void }) {
  const L = useL(), Tx = useT();
  return <div className="stack">
    <section className="card">
      <h2>{L("Mzunguko mmoja", "One loop")}</h2>
      <p className="muted small">{L("Kila nguzo inalisha inayofuata. Ikivunjika moja, mzunguko wote unadhoofika.", "Each pillar feeds the next. If one breaks, the whole loop weakens.")}</p>
      <ol className="loop">{LOOP.map(([t, n], i) => { const I = ICONS[t]; return <li key={t}><button className="loop-step" onClick={() => open(t)}><I size={20} aria-hidden /><b>{Tx(n)}</b><small>{Tx(TAB_NAMES[t])}</small></button>{i < LOOP.length - 1 ? <ArrowRight size={16} aria-hidden className="loop-arrow" /> : <small className="muted">↺ {L("tena", "again")}</small>}</li>; })}</ol>
    </section>
    <section className="card">
      <h2>{L("Timu ya wataalamu: mapengo na majibu", "The expert team: gaps and answers")}</h2>
      <p className="muted small">{L("Kila mtaalamu aliona pengo. Hapa ndipo jukwaa linalijibu, na kinachobaki wazi.", "Each expert saw a gap. Here is where the platform answers it, and what is still open.")}</p>
      <div className="table"><table>
        <thead><tr><th>{L("Mtaalamu", "Expert")}</th><th>{L("Pengo", "Gap")}</th><th>{L("Jibu hapa", "Answer here")}</th><th>{L("Bado wazi", "Still open")}</th></tr></thead>
        <tbody>{GAPS.map((g) => <tr key={g.role.en}><td><b>{Tx(g.role)}</b></td><td>{Tx(g.gap)}</td><td>{Tx(g.answer)} <button className="link" onClick={() => open(g.tab)}>{Tx(TAB_NAMES[g.tab as Tab])} →</button></td><td className="muted">{Tx(g.open)}</td></tr>)}</tbody>
      </table></div>
    </section>
  </div>;
}

/* ---------- 1. Money trail ---------- */
function Num({ label, value, set, step = 1, suffix }: { label: string; value: number; set: (n: number) => void; step?: number; suffix?: string }) {
  return <label>{label}{suffix && <small className="muted"> ({suffix})</small>}<input type="number" inputMode="decimal" min={0} step={step} value={value} onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))} /></label>;
}
function Money() {
  const L = useL(), Tx = useT();
  const [x, setX] = useStored<Ledger>("jlc-ledger", LEDGER_EXAMPLE);
  const [keep, setKeep] = useStored("jlc-keep", { pct: 15 });
  const l = ledger(x);
  const set = (k: keyof Ledger) => (n: number) => setX({ ...x, [k]: n });
  const setSplit = (k: keyof Ledger["split"]) => (n: number) => setX({ ...x, split: { ...x.split, [k]: n } });
  const pots = YEARS.map((y) => l.households * y.factor);
  const s = smooth(pots, keep.pct);
  const hh = Math.max(1, x.households);
  return <div className="stack">
    <div className="grid4">
      <div className="stat mint"><Coins size={28} aria-hidden /><div><b>{kes(l.gross)}</b><span>{L("Mauzo ya mwaka", "Year's sale")}</span></div></div>
      <div className="stat butter"><div><b>{kes(l.community)}</b><span>{L(`Mgao wa jamii (${l.sharePct}%)`, `Community share (${l.sharePct}%)`)}</span></div></div>
      <div className="stat lilac"><div><b>{kes(l.perHousehold)}</b><span>{L("Kwa kaya kwa mwaka", "Per household per year")}</span></div></div>
      <div className="stat pink"><div><b>{kes(l.perMonth)}</b><span>{L("Sawa na kwa mwezi", "About per month")}</span></div></div>
    </div>
    {l.warnings.map((w) => <p key={w.en} className="warn" role="alert"><AlertTriangle size={16} aria-hidden /> {Tx(w)}</p>)}
    <div className="grid-main">
      <section className="card">
        <h2>{L("Kila shilingi, hatua kwa hatua", "Every shilling, step by step")}</h2>
        <ul className="money-trail">{l.lines.map((ln) => (
          <li key={ln.id} data-level={ln.level}>
            <div className="row-between"><b>{Tx(ln.label)}</b><span className="mono">{kes(ln.kes)}</span></div>
            <span className="trail-bar"><i style={{ width: `${l.gross ? Math.max(1, Math.min(100, ln.kes / l.gross * 100)) : 0}%` }} /></span>
            <small className="muted">{L("Nani anashika", "Held by")}: {Tx(ln.holder)} · {L("Omba ushahidi", "Ask for proof")}: {Tx(ln.proof)}</small>
          </li>))}
        </ul>
        <p className="muted small">{L(`Ukaguzi: gharama + mgao wa jamii + mwekezaji = ${kes(l.costs + l.community + l.developer)}, sawa na mauzo. Hakuna shilingi inayopotea kwenye hesabu.`, `Check: costs + community share + developer = ${kes(l.costs + l.community + l.developer)}, equal to the sale. No shilling goes missing in the sums.`)}</p>
      </section>
      <section className="card">
        <h2>{L("Namba za mradi", "Project numbers")}</h2>
        <Num label={L("Mikopo iliyotolewa", "Credits issued")} suffix={L("tani", "tonnes")} value={x.tonnes} set={set("tonnes")} step={100} />
        <Num label={L("Akiba ya buffer", "Buffer pool")} suffix="%" value={x.bufferPct} set={set("bufferPct")} />
        <Num label={L("Bei kwa tani", "Price per tonne")} suffix="USD" value={x.priceUsd} set={set("priceUsd")} step={0.5} />
        <Num label={L("Kiwango cha ubadilishaji", "Exchange rate")} suffix="KES/USD" value={x.fx} set={set("fx")} />
        <Num label={L("Ada ya dalali", "Broker fee")} suffix="%" value={x.brokerPct} set={set("brokerPct")} />
        <Num label={L("Uhakiki na rejista", "Verification and registry")} suffix="KES" value={x.verifyKes} set={set("verifyKes")} step={100000} />
        <Num label={L("Gharama nyingine za mwekezaji", "Developer's other costs")} suffix="KES" value={x.opsKes} set={set("opsKes")} step={100000} />
        <label className="check"><input type="checkbox" checked={x.landBased} onChange={(e) => setX({ ...x, landBased: e.target.checked })} /> {L("Mradi wa ardhi (40%), vinginevyo 25%", "Land-based project (40%), otherwise 25%")}</label>
        <h3>{L("Jamii inagawaje mgao wake?", "How does the community split its share?")}</h3>
        <Num label={L("Akiba ya utulivu", "Stability reserve")} suffix="%" value={x.split.reserve} set={setSplit("reserve")} />
        <Num label={L("Miradi ya jamii", "Community projects")} suffix="%" value={x.split.projects} set={setSplit("projects")} />
        <Num label={L("Uendeshaji wa kamati", "Committee running costs")} suffix="%" value={x.split.committee} set={setSplit("committee")} />
        <Num label={L("Malipo kwa kaya", "Household payments")} suffix="%" value={x.split.households} set={setSplit("households")} />
        <Num label={L("Idadi ya kaya", "Number of households")} value={x.households} set={set("households")} step={10} />
        <button className="btn ghost small" onClick={() => setX(LEDGER_EXAMPLE)}>{L("Rudisha mfano", "Reset to example")}</button>
      </section>
    </div>
    <section className="card">
      <h2>{L("Malipo yanayotegemewa", "Reliable payouts")}</h2>
      <p className="muted small">{L("Mwaka wa ukame mikopo michache inauzwa. Akiba inayoweka sehemu ya malipo katika miaka mizuri inalipa zaidi katika miaka mibaya.", "In a drought year fewer credits sell. A reserve that keeps part of the payment in good years pays more in bad years.")}</p>
      <label>{L(`Weka akiba ${keep.pct}% kila mwaka`, `Keep ${keep.pct}% in reserve each year`)}<input type="range" min={0} max={40} value={keep.pct} onChange={(e) => setKeep({ pct: Number(e.target.value) })} /></label>
      <AreaChart label={L("Malipo kwa kaya kwa miaka mitano, bila na na akiba", "Payout per household over five years, with and without a reserve")}
        rows={YEARS.map((y, i) => ({ day: Tx(y.label), raw: Math.round(pots[i] / hh), kept: Math.round(s.paid[i] / hh) }))}
        series={[{ key: "raw", name: L("Bila akiba", "No reserve"), color: "#c8572a" }, { key: "kept", name: L("Na akiba", "With reserve"), color: "#1f4d3a" }]} />
      <p className="small">{L(`Tofauti kati ya mwaka bora na mbaya: ${kes(spread(pots) / hh)} bila akiba, ${kes(spread(s.paid) / hh)} na akiba. Akiba iliyobaki: ${kes(s.reserve / hh)} kwa kaya.`, `Gap between best and worst year: ${kes(spread(pots) / hh)} without a reserve, ${kes(spread(s.paid) / hh)} with one. Reserve left: ${kes(s.reserve / hh)} per household.`)}</p>
    </section>
  </div>;
}

/* ---------- 2. Household theory of change ---------- */
function Change() {
  const L = useL(), Tx = useT();
  const [shares, setShares] = useStored<Record<string, number>>("jlc-split", Object.fromEntries(BUCKETS.map((b) => [b.id, 1])));
  const total = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  const pay = ledger(LEDGER_EXAMPLE).perHousehold;
  const fed = (stage: string) => BUCKETS.filter((b) => b.feeds.includes(stage)).reduce((a, b) => a + (shares[b.id] ?? 0), 0) / total * 100;
  return <div className="stack">
    <section className="card">
      <h2>{L("Nadharia ya mabadiliko ndani ya kaya", "Theory of change inside the household")}</h2>
      <ol className="toc">{TOC.map((s, i) => (
        <li key={s.id}><span className="toc-n">{i + 1}</span><div>
          <b>{Tx(s.name)}</b><p className="small">{Tx(s.example)}</p>
          <p className="small"><span className="pill">{L("Kiashiria", "Indicator")}</span> {Tx(s.indicator)}</p>
          <p className="small muted"><span className="pill alt">{L("Dhana", "Assumption")}</span> {Tx(s.assumption)}</p>
          {fed(s.id) > 0 && <p className="small"><span className="trail-bar"><i style={{ width: `${fed(s.id)}%` }} /></span>{L(`${Math.round(fed(s.id))}% ya malipo yako yanalisha hatua hii`, `${Math.round(fed(s.id))}% of your payout feeds this stage`)}</p>}
        </div></li>))}
      </ol>
    </section>
    <section className="card">
      <h2>{L("Gawa malipo ya kaya", "Split the household payout")}</h2>
      <p className="muted small">{L(`Mfano: ${kes(pay)} kwa mwaka. Ongeza au punguza matofali kwa kila hitaji. Hakuna jibu moja sahihi.`, `Example: ${kes(pay)} a year. Add or remove bricks for each need. There is no single right answer.`)}</p>
      <div className="buckets">{BUCKETS.map((b) => (
        <div key={b.id} className="bucket">
          <b>{Tx(b.name)}</b>
          <small className="muted">{b.horizon === "now" ? L("Leo", "Today") : b.horizon === "soon" ? L("Msimu huu", "This season") : L("Miaka ijayo", "Years ahead")}{b.land ? L(" · ardhi", " · land") : ""}</small>
          <div className="bricks" aria-hidden>{Array.from({ length: shares[b.id] ?? 0 }, (_, i) => <i key={i} />)}</div>
          <div className="row"><button className="btn ghost small" aria-label={L(`Punguza ${Tx(b.name)}`, `Less for ${Tx(b.name)}`)} onClick={() => setShares({ ...shares, [b.id]: Math.max(0, (shares[b.id] ?? 0) - 1) })}>−</button>
            <span className="mono">{kes(pay * (shares[b.id] ?? 0) / total)}</span>
            <button className="btn ghost small" aria-label={L(`Ongeza ${Tx(b.name)}`, `More for ${Tx(b.name)}`)} onClick={() => setShares({ ...shares, [b.id]: Math.min(10, (shares[b.id] ?? 0) + 1) })}>+</button></div>
        </div>))}
      </div>
      <ul className="plain">{splitAdvice(shares).map((t) => <li key={t.en}>• {Tx(t)}</li>)}</ul>
      <p className="muted small">{L("Swali la kuuliza nyumbani: nani anaamua, na je, mwanamke na vijana wanashiriki?", "A question for home: who decides, and do the woman and the youth take part?")}</p>
    </section>
  </div>;
}

/* ---------- 3. Economics of change ---------- */
function Economics() {
  const L = useL();
  const [x, setX] = useStored<Econ>("jlc-econ", ECON_EXAMPLE);
  const [scale, setScale] = useStored("jlc-scale", { n: 100 });
  const e = econ(x);
  const set = (k: keyof Econ) => (n: number) => setX({ ...x, [k]: n });
  return <div className="stack">
    <div className="grid4">
      <div className={`stat ${e.npv >= 0 ? "mint" : "pink"}`}><TrendingUp size={28} aria-hidden /><div><b>{kes(e.npv)}</b><span>{L("Thamani ya leo (NPV)", "Value today (NPV)")}</span></div></div>
      <div className="stat butter"><div><b>{e.breakEven ? L(`Mwaka ${e.breakEven}`, `Year ${e.breakEven}`) : L("Haifiki", "Never")}</b><span>{L("Kurudisha gharama", "Break-even")}</span></div></div>
      <div className="stat lilac"><div><b>×{e.multiplier}</b><span>{L("Shilingi inazunguka kijijini", "Each shilling circulating locally")}</span></div></div>
      <div className="stat pink"><div><b>{kes(perHouseholdCost(600_000, 200, scale.n))}</b><span>{L(`Gharama ya ufuatiliaji kwa kaya (${scale.n})`, `Monitoring cost per household (${scale.n})`)}</span></div></div>
    </div>
    <div className="grid-main">
      <section className="card">
        <h2>{L("Faida na gharama kwa kaya, mwaka kwa mwaka", "Household gains and costs, year by year")}</h2>
        <AreaChart label={L("Faida, gharama na jumla", "Gains, costs and running total")} rows={e.rows.map((r) => ({ day: String(r.year), gain: r.gain, cost: r.cost, cum: Math.max(0, r.cum) }))}
          series={[{ key: "gain", name: L("Faida", "Gains"), color: "#1f4d3a" }, { key: "cost", name: L("Gharama", "Costs"), color: "#c8572a" }, { key: "cum", name: L("Jumla", "Running total"), color: "#9a7012" }]} />
        <p className="small">{L("Faida = malipo ya kaboni + mapato mapya kutoka mazoea bora (yanaongezeka polepole). Gharama = mapato yanayopotea kwa sheria za malisho + siku za kazi.", "Gains = carbon payout + new income from better practice (grows slowly). Costs = income lost to grazing rules + labour days.")}</p>
        <h3>{L("Uchumi wa ukubwa", "Economies of scale")}</h3>
        <label>{L(`Kaya ${scale.n} zinashirikiana gharama za ufuatiliaji na usimamizi`, `${scale.n} households share monitoring and admin costs`)}<input type="range" min={10} max={1000} step={10} value={scale.n} onChange={(ev) => setScale({ n: Number(ev.target.value) })} /></label>
        <p className="muted small">{L("Kaya nyingi zikiungana katika chama au ushirika, gharama kwa kila kaya inashuka, na sauti yao kwa mnunuzi inaongezeka.", "When many households join one group or cooperative, the cost per household falls and their voice with the buyer grows.")}</p>
        <p className="muted small">{L("Kizidishi kinatumia wazo la LM3 (mizunguko mitatu ya matumizi). Ni mfano wa kufundishia, si utabiri.", "The multiplier uses the LM3 idea (three rounds of spending). It is a teaching illustration, not a forecast.")}</p>
      </section>
      <section className="card">
        <h2>{L("Namba za kaya", "Household numbers")}</h2>
        <Num label={L("Malipo ya kaboni kwa mwaka", "Carbon payout per year")} suffix="KES" value={x.payout} set={set("payout")} step={500} />
        <Num label={L("Mapato yanayopotea kwa mwaka", "Income given up per year")} suffix="KES" value={x.lostIncome} set={set("lostIncome")} step={500} />
        <Num label={L("Siku za kazi za ziada", "Extra labour days")} value={x.labourDays} set={set("labourDays")} />
        <Num label={L("Ujira wa siku", "Day wage")} suffix="KES" value={x.dayWage} set={set("dayWage")} step={50} />
        <Num label={L("Mapato mapya kamili", "New income at full speed")} suffix="KES" value={x.newIncome} set={set("newIncome")} step={500} />
        <Num label={L("Miaka hadi kasi kamili", "Years to full speed")} value={x.rampYears} set={set("rampYears")} />
        <Num label={L("Miaka ya mkataba", "Years of the agreement")} value={x.years} set={(n) => setX({ ...x, years: Math.max(1, Math.min(40, n)) })} />
        <Num label={L("Kiwango cha punguzo", "Discount rate")} suffix="%" value={x.discountPct} set={set("discountPct")} />
        <Num label={L("Sehemu inayotumika kijijini", "Share spent locally")} suffix="%" value={x.localPct} set={(n) => setX({ ...x, localPct: Math.min(95, n) })} />
        <button className="btn ghost small" onClick={() => setX(ECON_EXAMPLE)}>{L("Rudisha mfano", "Reset to example")}</button>
      </section>
    </div>
  </div>;
}

/* ---------- 4. Knowledge pathways ---------- */
function Pathways({ open }: { open: (t: string) => void }) {
  const L = useL(), Tx = useT();
  return <div className="stack">
    <div className="paths">{PATHS.map((p) => (
      <section key={p.id} className="card stack-sm">
        <h2>{Tx(p.who)}</h2>
        <h3>{L("Wanahitaji kujua", "Need to know")}</h3><ul className="plain">{p.need.map((n) => <li key={n.en}>• {Tx(n)}</li>)}</ul>
        <h3>{L("Wanafanya nini nayo", "What they do with it")}</h3><ul className="plain">{p.act.map((n) => <li key={n.en}>• {Tx(n)}</li>)}</ul>
        <p className="small"><span className="pill">{L("Ushahidi", "Evidence")}</span> {Tx(p.evidence)}</p>
        <button className="btn ghost small" onClick={() => open(p.tool)}>{L("Fungua zana", "Open the tool")}: {Tx(TAB_NAMES[p.tool as Tab])}</button>
      </section>))}
    </div>
    <section className="card">
      <h2>{L("Viungo na mtaala wa CBE (Sekondari ya Chini)", "Links to the CBE curriculum (Junior School)")}</h2>
      <div className="table"><table><thead><tr><th>{L("Eneo la kujifunza", "Learning area")}</th><th>{L("Inafaa kwa", "Fits")}</th></tr></thead>
        <tbody>{CBE_LINKS.map((c) => <tr key={c.area.en}><td><b>{Tx(c.area)}</b></td><td>{Tx(c.fit)}</td></tr>)}</tbody></table></div>
      <p className="muted small">{L("Walimu wanachagua mada na kiwango. Viungo hivi bado havijapitiwa na KICD.", "Teachers choose the strand and level. These links have not been reviewed by KICD.")}</p>
    </section>
  </div>;
}

/* ---------- 5. Land monitor ---------- */
const blank = (): Check => ({ id: "", date: new Date().toISOString().slice(0, 10), season: "0", grass: 50, bare: 20, trees: 0, worms: 0, soakSec: 60, photo: false, note: "" });
function Regen() {
  const L = useL(), Tx = useT();
  const [checks, setChecks] = useList<Check>("jlc-regen");
  const [d, setD] = useState<Check>(blank);
  const t = regenTrend(checks);
  const sorted = [...checks].sort((a, b) => a.date.localeCompare(b.date));
  const csv = () => {
    const rows = [["date", "season", "grass_pct", "bare_pct", "trees", "worms", "soak_seconds", "photo", "score", "note"], ...sorted.map((c) => [c.date, SEASONS[+c.season]?.en ?? "", c.grass, c.bare, c.trees, c.worms, c.soakSec, c.photo ? "yes" : "no", regenScore(c), `"${c.note.replace(/"/g, "'")}"`])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "land-monitor.csv"; a.click();
  };
  const field = (k: "grass" | "bare" | "trees" | "worms" | "soakSec") => <Num label={Tx(METHODS.find((m) => m.id === k)!.name)} value={d[k]} set={(n) => setD({ ...d, [k]: k === "grass" || k === "bare" ? Math.min(100, n) : n })} />;
  return <div className="stack">
    <div className="grid4">
      <div className="stat mint"><Sprout size={28} aria-hidden /><div><b>{checks.length ? t.score : "-"}</b><span>{L("Alama ya urejeshaji (0-100)", "Regeneration score (0-100)")}</span></div></div>
      <div className="stat butter"><div><b>{t.change == null ? "-" : `${t.change > 0 ? "+" : ""}${t.change}`}</b><span>{L("Tangu kipimo kilichopita", "Since the last check")}</span></div></div>
      <div className="stat lilac"><div><b>{checks.length}</b><span>{L("Vipimo vilivyorekodiwa", "Checks recorded")}</span></div></div>
    </div>
    {t.alerts.map((a) => <p key={a.en} className="warn" role="alert"><AlertTriangle size={16} aria-hidden /> {Tx(a)}</p>)}
    <div className="grid-main">
      <section className="card">
        <h2>{L("Kipimo kipya", "New check")}</h2>
        <label>{L("Tarehe", "Date")}<input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></label>
        <label>{L("Msimu", "Season")}<select value={d.season} onChange={(e) => setD({ ...d, season: e.target.value })}>{SEASONS.map((s, i) => <option key={i} value={i}>{Tx(s)}</option>)}</select></label>
        {field("grass")}{field("bare")}{field("trees")}{field("worms")}{field("soakSec")}
        <label className="check"><input type="checkbox" checked={d.photo} onChange={(e) => setD({ ...d, photo: e.target.checked })} /> {L("Nimepiga picha ya kumbukumbu", "I took the photo point")}</label>
        <label>{L("Maelezo", "Notes")}<input value={d.note} maxLength={200} onChange={(e) => setD({ ...d, note: e.target.value })} /></label>
        <p className="small">{L("Alama ya kipimo hiki", "This check scores")}: <b>{regenScore(d)}</b></p>
        <button className="btn" onClick={() => { setChecks([...checks, { ...d, id: `c${Date.now().toString(36)}` }]); setD(blank()); }}><Plus size={16} aria-hidden /> {L("Hifadhi kipimo", "Save check")}</button>
      </section>
      <section className="card">
        <h2>{L("Jinsi ya kupima", "How to measure")}</h2>
        {METHODS.map((m) => <details key={m.id}><summary><b>{Tx(m.name)}</b></summary><p className="small">{Tx(m.how)}</p></details>)}
        <p className="muted small">{L("Kipimo hiki kinasaidia kaya na shule kuona mwelekeo. Hakihesabu tani za kaboni, na hakichukui nafasi ya MRV rasmi; lakini kinaipa jamii ushahidi wake yenyewe.", "This monitor helps households and schools see the direction of change. It does not count carbon tonnes or replace formal MRV, but it gives the community its own evidence.")}</p>
      </section>
    </div>
    {checks.length > 0 && <section className="card">
      <div className="row-between"><h2>{L("Historia", "History")}</h2><button className="btn ghost small" onClick={csv}><Download size={15} aria-hidden /> CSV</button></div>
      {sorted.length > 1 && <AreaChart label={L("Alama ya urejeshaji kwa muda", "Regeneration score over time")} rows={sorted.map((c) => ({ day: c.date.slice(2), score: regenScore(c), grass: c.grass }))} series={[{ key: "score", name: L("Alama", "Score"), color: "#1f4d3a" }, { key: "grass", name: L("Nyasi %", "Grass %"), color: "#9a7012" }]} />}
      <div className="table"><table><thead><tr><th>{L("Tarehe", "Date")}</th><th>{L("Msimu", "Season")}</th><th>{L("Nyasi", "Grass")}</th><th>{L("Tupu", "Bare")}</th><th>{L("Miti", "Trees")}</th><th>{L("Alama", "Score")}</th><th /></tr></thead>
        <tbody>{[...sorted].reverse().map((c) => <tr key={c.id}><td>{c.date}</td><td>{Tx(SEASONS[+c.season] ?? SEASONS[0])}</td><td>{c.grass}%</td><td>{c.bare}%</td><td>{c.trees}</td><td><b>{regenScore(c)}</b></td>
          <td><button className="icon" aria-label={L(`Futa kipimo cha ${c.date}`, `Delete the ${c.date} check`)} onClick={() => setChecks(checks.filter((x) => x.id !== c.id))}><Trash2 size={15} aria-hidden /></button></td></tr>)}</tbody></table></div>
    </section>}
  </div>;
}

/* ---------- 6. Clever farming ---------- */
function Farming() {
  const L = useL(), Tx = useT();
  const [season, setSeason] = useState(-1);
  const list = season < 0 ? PRACTICES : PRACTICES.filter((p) => p.when.includes(season));
  return <div className="stack">
    <div className="chips wrap" role="group" aria-label={L("Msimu", "Season")}>
      <button aria-pressed={season < 0} onClick={() => setSeason(-1)}>{L("Yote", "All")}</button>
      {SEASONS.map((s, i) => <button key={i} aria-pressed={season === i} onClick={() => setSeason(i)}>{Tx(s)}</button>)}
    </div>
    <div className="paths">{list.map((p) => (
      <section key={p.id} className="card stack-sm">
        <div className="row-between"><h2>{Tx(p.name)}</h2><span className="pill" aria-label={L(`Gharama ${p.cost} kati ya 3`, `Cost ${p.cost} of 3`)}>{L("Gharama", "Cost")} {"●".repeat(p.cost)}{"○".repeat(3 - p.cost)}</span></div>
        <p>{Tx(p.what)}</p>
        <p className="small"><b>{L("Ardhi", "Land")}:</b> {Tx(p.land)}</p>
        <p className="small"><b>{L("Mapato", "Income")}:</b> {Tx(p.income)}</p>
        <p className="small"><b>{L("Matokeo baada ya", "Benefit after")}:</b> {p.months < 12 ? L(`miezi ${p.months}`, `${p.months} months`) : L(`miaka ${p.months / 12}`, `${p.months / 12} years`)} · <b>{L("Msimu", "Season")}:</b> {p.when.map((w) => Tx(SEASONS[w]).split(" (")[0]).join(", ")}</p>
        <p className="small muted">⚑ {Tx(p.check)}</p>
      </section>))}
    </div>
    <p className="muted small">{L("Misimu inatofautiana kwa eneo. Anza na maarifa ya wazee wa eneo lenu, kisha zungumza na afisa wa kilimo. Kabla ya kuanza, hakikisha mkataba wa kaboni unaruhusu mazoea haya.", "Seasons vary by area. Start from your local elders' knowledge, then talk to an extension officer. Before starting, check that the carbon agreement allows the practice.")}</p>
  </div>;
}
