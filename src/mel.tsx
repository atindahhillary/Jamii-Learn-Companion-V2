import { AlertTriangle, ArrowDown, ArrowUp, Banknote, CalendarCheck, Download, FileText, GraduationCap, Landmark, Plus, Printer, Share2, Sprout, Trash2, Upload, Users, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { T } from "../shared/content";
import { BUCKETS, PRACTICES } from "../shared/impact";
import {
  AUDIENCE_OPTS, COUNTIES, DEFAULT_INDICATORS, KINDS, LEVELS, METRICS, SAMPLE_ISSUES, STAGES, applyItems, breakdown, byMonth, checkRecord, isSampleIssue, kpi, merge, metric, months, people, progress, sampleRecords, smart, stageCounts, toCsv,
  type Field, type Indicator, type Issue, type Item, type Kind, type MetricKey, type Rec,
} from "../shared/mel";
import { AreaChart, Bars, Donut } from "./charts";
import { useL, useT } from "./core";

/* ---------------- Device store (works offline) ---------------- */
// Everything is kept on the phone first, so collection never waits for signal; team sync and files move it between phones.
const read = <V,>(k: string, d: V): V => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
function useStore<V>(key: string, init: V): [V, (v: V) => void, () => void] {
  const [v, setV] = useState<V>(() => read(key, init));
  useEffect(() => { const f = (e: StorageEvent) => { if (e.key === key) setV(read(key, init)); }; addEventListener("storage", f); return () => removeEventListener("storage", f); }, [key]);
  return [v, (x) => { setV(x); if (!write(key, x)) alert("This phone's storage is full. Export your records now so nothing is lost."); }, () => setV(read(key, init))];
}
type Tomb = { id: string; ts: string };
const now = () => new Date().toISOString();
export function useMel() {
  const [recs, setRecs, reloadRecs] = useStore<Rec[]>("jlc-mel-recs", []);
  const [indicators, setIndicators, reloadInd] = useStore<Indicator[]>("jlc-mel-ind", DEFAULT_INDICATORS);
  const [stored, setStored, reloadIssues] = useStore<Issue[]>("jlc-mel-issues", SAMPLE_ISSUES);
  const [showSample, setShowSample] = useStore("jlc-mel-sample", true);
  const [lastShare, setLastShare] = useStore("jlc-mel-shared", "");
  const sample = useMemo(() => (showSample ? sampleRecords() : []), [showSample]);
  const bury = (kind: "issue" | "indicator", id: string) => write(`jlc-mel-tomb-${kind}`, [...read<Tomb[]>(`jlc-mel-tomb-${kind}`, []).filter((t) => t.id !== id), { id, ts: now() }]);
  // Fictional sample issues show only with sample data on, and are never sent to a team.
  const issues = showSample ? stored : stored.filter((i) => !isSampleIssue(i.id));
  return {
    recs, setRecs, all: [...sample, ...recs], showSample, setShowSample, lastShare, setLastShare,
    indicators, issues,
    saveIndicator: (i: Indicator) => setIndicators([...indicators.filter((x) => x.id !== i.id), { ...i, ts: now() }]),
    deleteIndicator: (id: string) => { bury("indicator", id); setIndicators(indicators.filter((x) => x.id !== id)); },
    addDefaults: () => setIndicators([...indicators, ...DEFAULT_INDICATORS.filter((d) => !indicators.some((x) => x.id === d.id)).map((d) => ({ ...d, ts: now() }))]),
    saveIssue: (i: Issue) => setStored(stored.some((x) => x.id === i.id) ? stored.map((x) => (x.id === i.id ? { ...i, ts: now() } : x)) : [...stored, { ...i, ts: now() }]),
    deleteIssue: (id: string) => { bury("issue", id); setStored(stored.filter((x) => x.id !== id)); },
    reload: () => { reloadRecs(); reloadInd(); reloadIssues(); },
  };
}
function useOnline() {
  const [on, setOn] = useState(() => navigator.onLine);
  useEffect(() => { const a = () => setOn(true), b = () => setOn(false); addEventListener("online", a); addEventListener("offline", b); return () => { removeEventListener("online", a); removeEventListener("offline", b); }; }, []);
  return on;
}

const fmt = (v: number, unit: string) => (unit === "KES" ? `KES ${v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : v.toLocaleString()}` : unit === "%" ? `${v}%` : `${v.toLocaleString()}${unit && unit !== "%" ? ` ${unit}` : ""}`);
const COLORS = ["#2f7d5b", "#1E88E5", "#FB8C00", "#E53935", "#7a3fa0", "#FDD835", "#29B6F6", "#9a7012"];
const label = (opts: [string, T][] | undefined, k: string, Tx: (t: T) => string) => { const f = opts?.find(([id]) => id === k); return f ? Tx(f[1]) : k; };

/* ---------------- Team sync: phones share records through the server whenever there is signal ---------------- */
type Team = { code: string; name: string; cursor: number; at: string; itemsCursor?: number };
// Issues and indicators travel whole (they are few); tombstones carry deletions; the server keeps the newest edit.
const localItems = (): Item[] => [
  ...read<Issue[]>("jlc-mel-issues", SAMPLE_ISSUES).filter((i) => !isSampleIssue(i.id)).map((i) => ({ kind: "issue" as const, id: i.id, ts: i.ts ?? "", data: i })),
  ...read<Indicator[]>("jlc-mel-ind", DEFAULT_INDICATORS).map((i) => ({ kind: "indicator" as const, id: i.id, ts: i.ts ?? "", data: i })),
  ...(["issue", "indicator"] as const).flatMap((kind) => read<Tomb[]>(`jlc-mel-tomb-${kind}`, []).map((t) => ({ kind, id: t.id, ts: t.ts, deleted: true }))),
].slice(0, 500);
function takeItems(incoming: Item[]) {
  for (const [kind, key, init] of [["issue", "jlc-mel-issues", SAMPLE_ISSUES], ["indicator", "jlc-mel-ind", DEFAULT_INDICATORS]] as const) {
    const mine = incoming.filter((i) => i.kind === kind);
    if (!mine.length) continue;
    const r = applyItems<{ id: string; ts?: string }>(read(key, init as { id: string }[]), read(`jlc-mel-tomb-${kind}`, []), mine);
    write(key, r.list); write(`jlc-mel-tomb-${kind}`, r.tombs);
  }
}
const melApi = async (body: unknown) => {
  const r = await fetch("/api/mel", { method: "POST", headers: { "content-type": "application/json", "x-ky": "1" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error ?? "server"), { status: r.status });
  return data;
};
let running = false; // one sync at a time per page
function useSync(reload: () => void) {
  const [team, setTeamState] = useState<Team | null>(() => read("jlc-mel-team", null));
  const [state, setState] = useState<"idle" | "busy" | "error">("idle"), [err, setErr] = useState("");
  const setTeam = (t: Team | null) => {
    if (t?.code !== read<Team | null>("jlc-mel-team", null)?.code) write("jlc-mel-synced", []); // a new team needs every record sent again
    setTeamState(t); write("jlc-mel-team", t);
  };
  const waiting = () => { const done = new Set(read<string[]>("jlc-mel-synced", [])); return read<Rec[]>("jlc-mel-recs", []).filter((r) => !done.has(r.id)).length; };
  const run = async (t = read<Team | null>("jlc-mel-team", null)) => {
    if (!t || running || !navigator.onLine) return;
    running = true; setState("busy"); setErr("");
    try {
      let cursor = t.cursor, itemsCursor = t.itemsCursor ?? 0, more = true, name = t.name, first = true;
      while (more) {
        const recs = read<Rec[]>("jlc-mel-recs", []), done = new Set(read<string[]>("jlc-mel-synced", []));
        const todo = recs.filter((r) => !done.has(r.id)).slice(0, 2000);
        const res = await melApi({ op: "sync", code: t.code, records: todo, since: cursor, items: first ? localItems() : [], itemsSince: itemsCursor });
        const merged = merge(recs, res.records ?? []);
        for (const r of [...todo, ...(res.records ?? [])]) done.add(r.id);
        write("jlc-mel-recs", merged.all); write("jlc-mel-synced", [...done]);
        takeItems(res.items ?? []);
        reload();
        cursor = res.cursor; itemsCursor = res.itemsCursor ?? itemsCursor; name = res.team || name; first = false;
        more = !!res.more || todo.length === 2000;
      }
      setTeam({ ...t, name, cursor, itemsCursor, at: new Date().toISOString() }); setState("idle");
    } catch (e: any) {
      setState("error");
      setErr(e?.status === 403 ? "unknown_team" : e?.status === 503 ? "not_configured" : e?.status ? "server" : "network");
    } finally { running = false; }
  };
  useEffect(() => {
    run();
    const on = () => run(), every = setInterval(() => run(), 60_000);
    addEventListener("online", on);
    return () => { removeEventListener("online", on); clearInterval(every); };
  }, [team?.code]);
  return { team, setTeam, state, err, run, waiting };
}

function SyncPanel({ sync }: { sync: ReturnType<typeof useSync> }) {
  const L = useL();
  const online = useOnline();
  const [name, setName] = useState(""), [code, setCode] = useState(""), [show, setShow] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const errText: Record<string, string> = {
    unknown_team: L("Nambari ya timu haitambuliki. Iangalie tena.", "Team code not recognised. Check it again."),
    not_configured: L("Usawazishaji haujawashwa kwenye seva hii bado.", "Sync is not switched on for this server yet."),
    server: L("Seva ina tatizo. Tutajaribu tena baada ya dakika moja.", "The server had a problem. We will try again in a minute."),
    network: L("Hakuna mtandao. Rekodi zitatumwa mtandao ukirudi.", "No signal. Records will be sent when signal returns."),
  };
  if (!sync.team) return <section className="card stack-sm">
    <h2>{L("Usawazishaji wa timu", "Team sync")}</h2>
    <p className="small">{L("Unganisha simu za timu ili rekodi, masuala ya utetezi na viashiria vifike kwa kila mtu na kwenye dashibodi moja, kila mtandao unapopatikana.", "Link the team's phones so records, advocacy issues and indicators reach everyone and one shared dashboard whenever there is signal.")}</p>
    <label>{L("Jiunge na timu: weka nambari ya timu", "Join a team: enter the team code")}<input value={code} placeholder="JLC-XXXX-XXXX-XXXX-XXXX" autoCapitalize="characters" onChange={(e) => setCode(e.target.value.toUpperCase())} /></label>
    <button className="btn" disabled={!online || busy || !/^JLC(-[A-Z2-7]{4}){4}$/.test(code.trim())} onClick={async () => { const t = { code: code.trim(), name: "", cursor: 0, at: "" }; sync.setTeam(t); }}>{L("Jiunge", "Join")}</button>
    <details><summary className="small"><b>{L("Mratibu? Unda timu mpya", "Coordinator? Create a new team")}</b></summary>
      <label>{L("Jina la timu", "Team name")}<input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
      <button className="btn ghost" disabled={!online || busy || !name.trim()} onClick={async () => {
        setBusy(true); setMsg("");
        try { const r = await melApi({ op: "team", name: name.trim() }); sync.setTeam({ code: r.code, name: name.trim(), cursor: 0, at: "" }); }
        catch (e: any) { setMsg(e?.status === 503 ? errText.not_configured : e?.status === 429 ? L("Subiri kidogo kisha ujaribu tena.", "Please wait a little and try again.") : errText.server); }
        finally { setBusy(false); }
      }}>{L("Unda timu", "Create team")}</button>
    </details>
    {!online && <p className="muted small">{L("Unahitaji mtandao kujiunga au kuunda timu. Unaweza kuendelea kukusanya data.", "You need signal to join or create a team. You can keep collecting meanwhile.")}</p>}
    {msg && <p className="small" role="status">{msg}</p>}
  </section>;
  const wait = sync.waiting();
  return <section className="card stack-sm">
    <div className="row-between"><h2>{L("Timu", "Team")}: {sync.team.name || "…"}</h2><span className={`pill ${sync.state === "error" ? "alt" : ""}`}>{sync.state === "busy" ? L("Inasawazisha…", "Syncing…") : sync.state === "error" ? L("Haijasawazishwa", "Not synced") : L("Imesawazishwa", "Synced")}</span></div>
    <p className="small" role="status">{sync.state === "error" ? errText[sync.err] : sync.team.at ? L(`Mara ya mwisho: ${new Date(sync.team.at).toLocaleString()}`, `Last synced: ${new Date(sync.team.at).toLocaleString()}`) : L("Bado haijasawazishwa.", "Not synced yet.")} · {L(`${wait} zinasubiri kutumwa`, `${wait} waiting to send`)}</p>
    <div className="row"><button className="btn small" disabled={!online || sync.state === "busy"} onClick={() => sync.run()}>{L("Sawazisha sasa", "Sync now")}</button>
      <button className="btn ghost small" onClick={() => setShow(!show)}>{show ? L("Ficha nambari", "Hide code") : L("Onyesha nambari ya timu", "Show team code")}</button></div>
    {show && <p className="note small"><b className="mono">{sync.team.code}</b><br />{L("Shiriki nambari hii na wanatimu tu. Mwenye nambari anaweza kuona na kuongeza rekodi za timu.", "Share this code only with team members. Anyone with it can see and add the team's records.")}</p>}
    <button className="link small" onClick={() => { if (confirm(L("Ondoka kwenye timu? Rekodi zinabaki kwenye simu hii.", "Leave the team? Records stay on this phone."))) sync.setTeam(null); }}>{L("Ondoka kwenye timu", "Leave team")}</button>
  </section>;
}

/* ---------------- Dashboard ---------------- */
const KPI_CARDS: [MetricKey, typeof Banknote, string][] = [["paid", Banknote, "#2f7d5b"], ["onTime", CalendarCheck, "#FB8C00"], ["households", Users, "#1E88E5"], ["jointDecide", Users, "#7a3fa0"], ["regen", Sprout, "#43A047"], ["reached", GraduationCap, "#E53935"]];

function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data), min = Math.min(0, ...data);
  const pts = data.map((d, i) => `${(i / Math.max(1, data.length - 1)) * 80},${28 - ((d - min) / (max - min || 1)) * 26}`).join(" ");
  return <svg viewBox="0 0 80 30" className="spark" aria-hidden><polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" /></svg>;
}

export function Dashboard({ open }: { open: (t: string) => void }) {
  const L = useL(), Tx = useT();
  const m = useMel();
  const sync = useSync(m.reload); // the dashboard pulls the team's latest records whenever it is open with signal
  // Region (county) first, then a village inside it. "none" catches older records saved before counties were asked.
  const [region, setRegion] = useState(""), [village, setVillage] = useState("");
  const regions = [...new Set(m.all.map((r) => r.county ?? "none"))].sort((a, b) => (a === "none" ? 1 : b === "none" ? -1 : a.localeCompare(b)));
  const inRegion = region ? m.all.filter((r) => (r.county ?? "none") === region) : m.all;
  const villages = [...new Set(inRegion.map((r) => r.village).filter(Boolean))].sort();
  const recs = village ? inRegion.filter((r) => r.village === village) : inRegion;
  const ms = months();
  const k = Object.fromEntries(KPI_CARDS.map(([key]) => [key, kpi(key, recs, m.issues)])) as Record<MetricKey, ReturnType<typeof kpi>>;
  const use = breakdown(recs, "payout", "use");
  const paidTo = breakdown(recs, "payout", "paidTo");
  const aud = breakdown(recs, "training", "audience", people);
  const audTotal = Object.values(aud).reduce((a, b) => a + b, 0) || 1;
  const prac = breakdown(recs.filter((r) => r.v.status !== "planned"), "practice", "practice");
  const pracMax = Math.max(1, ...Object.values(prac));
  const insights = KPI_CARDS.map(([key]) => ({ key, ...k[key] })).filter((x) => x.change != null && x.change !== 0).map((x) => {
    const good = (x.change! > 0) === (METRICS[x.key].better === "up");
    return { good, text: L(`${Tx(METRICS[x.key].name)}: ${x.change! > 0 ? "imepanda" : "imeshuka"} kwa ${Math.abs(x.change!)}% ikilinganishwa na robo iliyopita.`, `${Tx(METRICS[x.key].name)} ${x.change! > 0 ? "rose" : "fell"} ${Math.abs(x.change!)}% compared with last quarter.`) };
  });
  if (!m.all.length) return <section className="card stack"><h2>{L("Bado hakuna data", "No data yet")}</h2><p>{L("Anza kukusanya data ya ardhini, au washa data ya mfano kuona dashibodi inavyofanya kazi.", "Start collecting ground data, or turn on sample data to see how the dashboard works.")}</p><div className="row"><button className="btn" onClick={() => open("collect")}><Plus size={16} aria-hidden /> {L("Kusanya data", "Collect data")}</button><button className="btn ghost" onClick={() => m.setShowSample(true)}>{L("Onyesha data ya mfano", "Show sample data")}</button></div></section>;
  return <div className="stack dash">
    <div className="dash-bar">
      <label className="inline">{L("Kaunti", "Region (county)")} <select value={region} onChange={(e) => { setRegion(e.target.value); setVillage(""); }}><option value="">{L("Zote", "All")}</option>{regions.map((c) => <option key={c} value={c}>{c === "none" ? L("Haijawekwa", "Not set") : c}</option>)}</select></label>
      <label className="inline">{L("Kijiji", "Village")} <select value={village} onChange={(e) => setVillage(e.target.value)}><option value="">{L("Vyote", "All")}</option>{villages.map((v) => <option key={v}>{v}</option>)}</select></label>
      <span className="muted small">{L(`Rekodi ${recs.length} · robo hii dhidi ya robo iliyopita`, `${recs.length} records · this quarter vs last quarter`)}{sync.team && <> · {L("Timu", "Team")} {sync.team.name}: {sync.state === "busy" ? L("inasawazisha…", "syncing…") : sync.team.at ? L(`imesawazishwa ${new Date(sync.team.at).toLocaleTimeString()}`, `synced ${new Date(sync.team.at).toLocaleTimeString()}`) : L("bado", "not yet synced")}</>}</span>
      <span className="grow" />
      <label className="check small"><input type="checkbox" checked={m.showSample} onChange={(e) => m.setShowSample(e.target.checked)} /> {L("Jumuisha data ya mfano (ya kubuni)", "Include sample data (fictional)")}</label>
    </div>
    {m.showSample && <p className="warn small"><AlertTriangle size={15} aria-hidden /> {L("Dashibodi inaonyesha data ya mfano ya kubuni pamoja na rekodi zako. Izime kabla ya kutoa ripoti.", "The dashboard is showing fictional sample data alongside your records. Turn it off before reporting.")}</p>}
    <div className="kpis">{KPI_CARDS.map(([key, Icon, color]) => {
      const x = k[key], meta = METRICS[key];
      const good = x.change != null && (x.change > 0) === (meta.better === "up");
      return <section key={key} className="kpi-card">
        <div className="row"><span className="kpi-ic" style={{ background: color }}><Icon size={18} aria-hidden /></span><small>{Tx(meta.name)}</small></div>
        <b>{fmt(key === "paid" || key === "households" || key === "reached" ? x.total : x.cur || x.total, meta.unit)}</b>
        <div className="row-between">
          {x.change == null ? <small className="muted">{L("Hakuna robo ya kulinganisha", "No earlier quarter")}</small> : <small className={good ? "up" : "down"}>{x.change > 0 ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />} {Math.abs(x.change)}% <span className="muted">{L("dhidi ya robo iliyopita", "vs last quarter")}</span></small>}
          <Spark data={byMonth(key, recs, ms)} color={color} />
        </div>
      </section>;
    })}</div>
    <div className="dash-grid">
      <section className="card span2"><h2>{L("Mwenendo wa athari kwa mwezi", "Monthly impact trend")}</h2>
        <AreaChart label={L("Alama ya urejeshaji, malipo kwa wakati na wanawake waliofundishwa, kwa mwezi", "Regeneration score, on-time payments and women trained, by month")}
          rows={ms.map((mo, i) => ({ day: mo.slice(2), regen: byMonth("regen", recs, ms)[i], onTime: byMonth("onTime", recs, ms)[i], women: byMonth("womenReached", recs, ms)[i] }))}
          series={[{ key: "regen", name: L("Urejeshaji /100", "Regeneration /100"), color: "#43A047" }, { key: "onTime", name: L("Malipo kwa wakati %", "On-time payouts %"), color: "#FB8C00" }, { key: "women", name: L("Wanawake waliofundishwa %", "Women trained %"), color: "#7a3fa0" }]} />
      </section>
      <section className="card"><h2>{L("Kaya zinatumia malipo kwa nini", "How households use payouts")}</h2>
        <Donut label={L("Matumizi ya malipo", "Payout use")} center={String(Object.values(use).reduce((a, b) => a + b, 0))} sub={L("malipo", "payouts")} parts={BUCKETS.map((b, i) => ({ name: Tx(b.name), value: use[b.id] ?? 0, color: COLORS[i] }))} />
      </section>
      <section className="card"><h2>{L("Maarifa muhimu", "Key insights")}</h2>
        {insights.length ? <ul className="insights">{insights.map((x) => <li key={x.text} data-good={x.good}>{x.good ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />} {x.text}</li>)}</ul> : <p className="muted small">{L("Ongeza rekodi za robo mbili kuona mabadiliko.", "Add records across two quarters to see changes.")}</p>}
      </section>
      <section className="card"><h2>{L("Watu waliofikiwa kwa kundi", "People reached by audience")}</h2>
        <Bars suffix="%" rows={AUDIENCE_OPTS.map(([id, n]) => ({ name: Tx(n), value: Math.round((aud[id] ?? 0) / audTotal * 100), note: L(`watu ${aud[id] ?? 0}`, `${aud[id] ?? 0} people`) }))} />
      </section>
      <section className="card"><h2>{L("Malipo yanapokelewa na nani", "Who receives payouts")}</h2>
        <Donut label={L("Mpokeaji wa malipo", "Payout recipient")} center={`${metric("womenJoint", recs)}%`} sub={L("mwanamke/pamoja", "woman/joint")} parts={KINDS.payout.fields[3].options!.map(([id, n], i) => ({ name: Tx(n), value: paidTo[id] ?? 0, color: ["#2f7d5b", "#7a3fa0", "#1E88E5", "#9a7012"][i] }))} />
      </section>
      <section className="card span2"><h2>{L("Malengo SMART", "SMART goals")}</h2>
        <ul className="goals">{m.indicators.map((i) => { const val = metric(i.metric, recs, m.issues); const p = progress(i, val); return <li key={i.id}><div className="row-between"><span className="small">{Tx(i.name)}</span><b>{p}%</b></div><span className="trail-bar"><i style={{ width: `${p}%` }} /></span><small className="muted">{L("Sasa", "Now")}: {fmt(val, METRICS[i.metric].unit)} · {L("Lengo", "Target")}: {fmt(i.target, METRICS[i.metric].unit)} · {i.due}</small></li>; })}</ul>
      </section>
      <section className="card"><h2>{L("Mazoea yanayotumika", "Practices in use")}</h2>
        <Bars rows={PRACTICES.map((p) => ({ name: Tx(p.name), value: Math.round((prac[p.id] ?? 0) / pracMax * 100), note: L(`${prac[p.id] ?? 0} zimeanza au zimeimarika`, `${prac[p.id] ?? 0} started or established`) }))} />
      </section>
      <section className="card"><h2>{L("Utetezi wa sera", "Policy advocacy")}</h2>
        <ol className="funnel">{STAGES.map((s, i) => <li key={s.en} style={{ width: `${100 - i * 8}%` }}><span>{Tx(s)}</span><b>{stageCounts(m.issues)[i]}</b></li>)}</ol>
        <button className="btn ghost small" onClick={() => open("advocacy")}>{L("Fungua kifuatiliaji", "Open the tracker")}</button>
      </section>
    </div>
  </div>;
}

/* ---------------- Collect: offline-first forms ---------------- */
function Input({ f, value, set }: { f: Field; value: string; set: (v: string) => void }) {
  const Tx = useT();
  const lab = <>{Tx(f.label)}{f.required && " *"}</>;
  if (f.type === "select" || f.type === "yesno") return <label>{lab}<select value={value} onChange={(e) => set(e.target.value)}><option value="">—</option>{f.options!.map(([k, n]) => <option key={k} value={k}>{Tx(n)}</option>)}</select></label>;
  return <label>{lab}<input type={f.type === "number" ? "number" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} min={f.min} max={f.max} value={value} maxLength={80} onChange={(e) => set(e.target.value)} />{f.hint && <small className="muted">{Tx(f.hint)}</small>}</label>;
}
export function Collect() {
  const L = useL(), Tx = useT();
  const m = useMel(), online = useOnline();
  const sync = useSync(m.reload);
  const [kind, setKind] = useState<Kind>("payout");
  const today = new Date().toISOString().slice(0, 10);
  const [base, setBase] = useState(() => ({ county: "", ...read("jlc-mel-who", { village: "", collector: "" }) }));
  const [date, setDate] = useState(today), [note, setNote] = useState(""), [v, setV] = useState<Record<string, string>>({}), [msg, setMsg] = useState("");
  const unshared = m.recs.filter((r) => r.createdAt > m.lastShare).length;
  const save = () => {
    if (!base.county) { setMsg(L("Chagua kaunti kwanza.", "Choose the county first.")); return; }
    const c = checkRecord({ kind, date, county: base.county, village: base.village, collector: base.collector, note, v, createdAt: new Date().toISOString() });
    if (!c.ok) { const f = KINDS[kind].fields.find((x) => x.key === c.why); setMsg(L(`Angalia: ${f ? Tx(f.label) : c.why}`, `Check: ${f ? Tx(f.label) : c.why}`)); return; }
    m.setRecs([...m.recs, c.rec]); write("jlc-mel-who", base); setV({}); setNote(""); setMsg(L("Imehifadhiwa kwenye simu hii. ✔", "Saved on this phone. ✔"));
    sync.run();
  };
  const file = () => new File([JSON.stringify({ app: "jamii-mel", v: 1, exported: new Date().toISOString(), records: m.recs, issues: m.issues })], `jamii-data-${today}-${(base.collector || "device").replace(/\W+/g, "-")}.json`, { type: "application/json" });
  const share = async () => {
    const f = file();
    try { if ((navigator as any).canShare?.({ files: [f] })) { await (navigator as any).share({ files: [f], title: f.name }); m.setLastShare(new Date().toISOString()); return; } } catch { return; /* user cancelled */ }
    const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); m.setLastShare(new Date().toISOString());
  };
  const csv = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([toCsv(m.recs)], { type: "text/csv" })); a.download = `jamii-data-${today}.csv`; a.click(); };
  const load = async (fl: File | undefined) => {
    if (!fl) return;
    try {
      const data = JSON.parse(await fl.text());
      if (!data || !Array.isArray(data.records)) throw new Error("shape");
      const r = merge(m.recs, data.records.slice(0, 20000));
      m.setRecs(r.all);
      setMsg(L(`Rekodi mpya ${r.added}, zilizokuwepo ${r.dupes}, zenye kosa ${r.bad}.`, `${r.added} new records, ${r.dupes} already here, ${r.bad} with errors.`));
    } catch { setMsg(L("Faili hili si la Jamii au limeharibika.", "This file is not a Jamii file or is damaged.")); }
  };
  return <div className="stack">
    <p className={`net ${online ? "on" : "off"}`}>{online ? <Wifi size={16} aria-hidden /> : <WifiOff size={16} aria-hidden />} {online ? L("Mtandaoni. Fomu hizi pia zinafanya kazi bila mtandao.", "Online. These forms also work with no network.") : L("Huna mtandao. Endelea kukusanya: kila kitu kinahifadhiwa kwenye simu hii.", "Offline. Keep collecting: everything is saved on this phone.")}</p>
    <div className="grid-main">
      <section className="card">
        <h2>{L("Rekodi mpya ya ardhini", "New ground record")}</h2>
        <div className="chips wrap" role="group" aria-label={L("Aina ya rekodi", "Record type")}>{(Object.keys(KINDS) as Kind[]).map((id) => <button key={id} aria-pressed={kind === id} onClick={() => { setKind(id); setV({}); setMsg(""); }}>{Tx(KINDS[id].name)}</button>)}</div>
        <div className="form-grid">
          <label>{L("Tarehe", "Date")} *<input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></label>
          <label>{L("Kaunti", "County")} *<select value={base.county} onChange={(e) => setBase({ ...base, county: e.target.value })}><option value="">—</option>{COUNTIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>{L("Kijiji", "Village")}<input value={base.village} maxLength={60} onChange={(e) => setBase({ ...base, village: e.target.value })} /></label>
          <label>{L("Mkusanyaji", "Collector")}<input value={base.collector} maxLength={60} onChange={(e) => setBase({ ...base, collector: e.target.value })} /></label>
          {KINDS[kind].fields.map((f) => <Input key={f.key} f={f} value={v[f.key] ?? ""} set={(x) => setV({ ...v, [f.key]: x })} />)}
        </div>
        <label>{L("Walichosema, kwa maneno yao", "What they said, in their own words")}<textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="row"><button className="btn" onClick={save}><Plus size={16} aria-hidden /> {L("Hifadhi rekodi", "Save record")}</button>{msg && <span role="status" className="small">{msg}</span>}</div>
      </section>
      <div className="stack">
      <SyncPanel sync={sync} />
      <section className="card stack-sm">
        <h2>{L("Shiriki kwa faili (bila mtandao)", "Share by file (no signal)")}</h2>
        <p className="small">{L(`Rekodi ${m.recs.length} kwenye simu hii; ${unshared} bado hazijashirikiwa.`, `${m.recs.length} records on this phone; ${unshared} not yet shared.`)}</p>
        <button className="btn" onClick={share} disabled={!m.recs.length}><Share2 size={16} aria-hidden /> {L("Tuma faili la data", "Send data file")}</button>
        <p className="muted small">{L("Tuma kwa mratibu kupitia WhatsApp, Bluetooth au barua pepe ukipata mtandao.", "Send to the coordinator by WhatsApp, Bluetooth or email when you have signal.")}</p>
        <label className="btn ghost"><Upload size={16} aria-hidden /> {L("Unganisha faili kutoka simu nyingine", "Combine a file from another phone")}<input type="file" accept="application/json,.json" className="sr" onChange={(e) => { load(e.target.files?.[0]); e.target.value = ""; }} /></label>
        <button className="btn ghost" onClick={csv} disabled={!m.recs.length}><Download size={16} aria-hidden /> CSV (Excel)</button>
        <p className="muted small">{L("Rekodi zinahifadhiwa kama zilivyoandikwa. Faili likiunganishwa mara mbili, hakuna rekodi inayohesabiwa mara mbili.", "Records are kept exactly as entered. Combining the same file twice never counts a record twice.")}</p>
      </section>
      </div>
    </div>
    {m.recs.length > 0 && <section className="card">
      <h2>{L("Rekodi za simu hii", "Records on this phone")}</h2>
      <div className="table"><table><thead><tr><th>{L("Tarehe", "Date")}</th><th>{L("Aina", "Type")}</th><th>{L("Kijiji", "Village")}</th><th>{L("Data", "Data")}</th><th /></tr></thead>
        <tbody>{[...m.recs].reverse().slice(0, 50).map((r) => <tr key={r.id}><td>{r.date}</td><td>{Tx(KINDS[r.kind].name)}</td><td>{[r.village, r.county].filter(Boolean).join(", ")}</td>
          <td className="small">{KINDS[r.kind].fields.filter((f) => r.v[f.key] != null).map((f) => `${Tx(f.label)}: ${f.options ? label(f.options, String(r.v[f.key]), Tx) : r.v[f.key]}`).join(" · ")}{r.note && <em className="block muted">"{r.note}"</em>}</td>
          <td><button className="icon" aria-label={L("Futa rekodi", "Delete record")} onClick={() => { if (confirm(L("Futa rekodi hii?", "Delete this record?"))) m.setRecs(m.recs.filter((x) => x.id !== r.id)); }}><Trash2 size={15} aria-hidden /></button></td></tr>)}</tbody></table></div>
    </section>}
  </div>;
}

/* ---------------- SMART indicators ---------------- */
const blankInd = (): Indicator => ({ id: "", pillar: "money", metric: "paid", name: { sw: "", en: "" }, baseline: 0, target: 0, due: "", source: { sw: "", en: "" }, frequency: { sw: "", en: "" }, owner: "" });
export function Indicators() {
  const L = useL(), Tx = useT();
  const m = useMel();
  useSync(m.reload); // team indicators stay in step while this page is open
  const [d, setD] = useState<Indicator>(blankInd);
  const draft = { ...d, pillar: METRICS[d.metric].pillar, name: { sw: d.name.en, en: d.name.en } };
  const s = smart(draft);
  const Letters = ({ x }: { x: ReturnType<typeof smart> }) => <span className="smart">{(Object.keys(x) as (keyof typeof x)[]).map((k) => <i key={k} data-ok={x[k]} title={k}>{k}</i>)}</span>;
  return <div className="stack">
    <section className="card">
      <h2>{L("Mfumo wa viashiria (MEL)", "Indicator framework (MEL)")}</h2>
      <p className="muted small">{L("Kila kiashiria ni SMART: Mahususi, Kinapimika, Kinawezekana, Kinahusika, na kina Muda. Thamani ya sasa inahesabiwa moja kwa moja kutoka rekodi za ardhini.", "Every indicator is SMART: Specific, Measurable, Achievable, Relevant and Time-bound. The current value is computed straight from ground records.")}</p>
      <div className="table"><table><thead><tr><th>SMART</th><th>{L("Kiashiria", "Indicator")}</th><th>{L("Msingi", "Baseline")}</th><th>{L("Sasa", "Now")}</th><th>{L("Lengo", "Target")}</th><th>{L("Chanzo / mara ngapi", "Source / how often")}</th><th>{L("Mhusika", "Owner")}</th><th /></tr></thead>
        <tbody>{m.indicators.map((i) => { const val = metric(i.metric, m.all, m.issues); const u = METRICS[i.metric].unit; return <tr key={i.id}><td><Letters x={smart(i)} /></td><td style={{ minWidth: 260 }}>{Tx(i.name)}<small className="block muted">{Tx(METRICS[i.metric].name)}</small></td><td>{fmt(i.baseline, u)}</td><td><b>{fmt(val, u)}</b><small className="block muted">{progress(i, val)}%</small></td><td>{fmt(i.target, u)}<small className="block muted">{i.due}</small></td><td className="small">{Tx(i.source)} · {Tx(i.frequency)}</td><td className="small">{i.owner}</td>
          <td><button className="icon" aria-label={L("Futa kiashiria", "Delete indicator")} onClick={() => { if (confirm(L("Futa kiashiria hiki?", "Delete this indicator?"))) m.deleteIndicator(i.id); }}><Trash2 size={15} aria-hidden /></button></td></tr>; })}</tbody></table></div>
      <button className="btn ghost small" onClick={m.addDefaults}>{L("Ongeza tena viashiria vya msingi vilivyokosekana", "Add back missing default indicators")}</button>
    </section>
    <section className="card">
      <h2>{L("Ongeza kiashiria SMART", "Add a SMART indicator")} <Letters x={s} /></h2>
      <div className="form-grid">
        <label>{L("Kiashiria kamili (nini, kiasi gani, lini)", "Full indicator (what, how much, by when)")}<input value={d.name.en} maxLength={160} placeholder={L("mf. 80% ya kaya zina akiba ifikapo Juni 2027", "e.g. 80% of households have savings by June 2027")} onChange={(e) => setD({ ...d, name: { sw: e.target.value, en: e.target.value } })} /></label>
        <label>{L("Kinapimwa kwa", "Measured by")}<select value={d.metric} onChange={(e) => setD({ ...d, metric: e.target.value as MetricKey })}>{(Object.keys(METRICS) as MetricKey[]).map((k) => <option key={k} value={k}>{Tx(METRICS[k].name)} ({METRICS[k].unit || "#"})</option>)}</select></label>
        <label>{L("Msingi", "Baseline")}<input type="number" value={d.baseline} onChange={(e) => setD({ ...d, baseline: Number(e.target.value) })} /></label>
        <label>{L("Lengo", "Target")}<input type="number" value={d.target} onChange={(e) => setD({ ...d, target: Number(e.target.value) })} /></label>
        <label>{L("Tarehe ya mwisho", "Due date")}<input type="date" value={d.due} onChange={(e) => setD({ ...d, due: e.target.value })} /></label>
        <label>{L("Mhusika", "Owner (role)")}<input value={d.owner} maxLength={60} onChange={(e) => setD({ ...d, owner: e.target.value })} /></label>
      </div>
      <ul className="plain small">
        {!s.S && <li>• S: {L("Andika kiashiria kwa undani (angalau herufi 20).", "Write the indicator in full (at least 20 characters).")}</li>}
        {!s.M && <li>• M: {L("Lengo lazima liwe tofauti na msingi.", "The target must differ from the baseline.")}</li>}
        {!s.A && <li>• A: {L("Weka mhusika; asilimia iwe kati ya 0 na 100.", "Name an owner; percentages must be 0-100.")}</li>}
        {!s.T && <li>• T: {L("Weka tarehe ya baadaye, na namba ndani ya kiashiria.", "Set a future date, and put a number in the indicator.")}</li>}
      </ul>
      <button className="btn" disabled={!Object.values(s).every(Boolean)} onClick={() => { m.saveIndicator({ ...draft, id: `i${Date.now().toString(36)}`, source: KINDS_SOURCE(d.metric), frequency: { sw: "Kila robo", en: "Quarterly" } }); setD(blankInd()); }}><Plus size={16} aria-hidden /> {L("Ongeza", "Add")}</button>
    </section>
  </div>;
}
const KINDS_SOURCE = (k: MetricKey): T => {
  const kind: Record<string, Kind | "advocacy"> = { money: "payout", change: "household", economics: "household", regen: "land", farming: "practice", pathways: "training", advocacy: "advocacy" };
  const id = k === "womenJoint" || k === "households" ? "payout" : kind[METRICS[k].pillar];
  return id === "advocacy" ? { sw: "Kifuatiliaji cha utetezi", en: "Advocacy tracker" } : KINDS[id as Kind].name;
};

/* ---------------- Policy advocacy ---------------- */
const blankIssue = (): Issue => ({ id: "", title: "", level: "cda", target: "", ask: "", evidence: [], stage: 0, next: "", updated: new Date().toISOString().slice(0, 10), log: [] });
export function Advocacy() {
  const L = useL(), Tx = useT();
  const m = useMel();
  useSync(m.reload); // team advocacy stays in step while this page is open
  const [d, setD] = useState<Issue>(blankIssue);
  const [brief, setBrief] = useState<Issue | null>(null);
  const counts = stageCounts(m.issues);
  const move = (i: Issue, stage: number) => m.saveIssue({ ...i, stage, updated: new Date().toISOString().slice(0, 10), log: [...i.log, { date: new Date().toISOString().slice(0, 10), stage, note: "" }] });
  if (brief) return <PolicyBrief issue={brief} onBack={() => setBrief(null)} />;
  return <div className="stack">
    <div className="kpis">
      <section className="kpi-card"><div className="row"><span className="kpi-ic" style={{ background: "#1E88E5" }}><Landmark size={18} aria-hidden /></span><small>{L("Masuala yanayofuatiliwa", "Issues tracked")}</small></div><b>{m.issues.length}</b></section>
      <section className="kpi-card"><div className="row"><span className="kpi-ic" style={{ background: "#FB8C00" }}><Users size={18} aria-hidden /></span><small>{L("Watoa uamuzi wamefikiwa", "Decision makers engaged")}</small></div><b>{m.issues.filter((i) => i.stage >= 2).length}</b></section>
      <section className="kpi-card"><div className="row"><span className="kpi-ic" style={{ background: "#2f7d5b" }}><CalendarCheck size={18} aria-hidden /></span><small>{L("Ahadi au ushindi", "Commitments or wins")}</small></div><b>{m.issues.filter((i) => i.stage >= 4).length}</b></section>
    </div>
    <section className="card">
      <h2>{L("Hatua za utetezi", "Advocacy stages")}</h2>
      <ol className="funnel">{STAGES.map((s, i) => <li key={s.en} style={{ width: `${100 - i * 8}%` }}><span>{Tx(s)}</span><b>{counts[i]}</b></li>)}</ol>
    </section>
    {m.issues.map((i) => <section key={i.id} className="card stack-sm">
      <div className="row-between"><h2>{i.title}</h2><span className="pill">{label(LEVELS, i.level, Tx)}</span></div>
      <p className="small"><b>{L("Ombi", "Ask")}:</b> {i.ask} · <b>{L("Mlengwa", "Target")}:</b> {i.target}</p>
      <div className="stages">{STAGES.map((s, n) => <button key={s.en} aria-pressed={i.stage === n} data-done={n <= i.stage} title={Tx(s)} onClick={() => move(i, n)}>{n + 1}</button>)}<small className="muted">{Tx(STAGES[i.stage])}</small></div>
      <p className="small"><b>{L("Ushahidi", "Evidence")}:</b> {i.evidence.map((e) => m.indicators.find((x) => x.id === e)).filter(Boolean).map((x) => `${Tx(METRICS[x!.metric].name)} = ${fmt(metric(x!.metric, m.all, m.issues), METRICS[x!.metric].unit)}`).join(" · ") || "—"}</p>
      <label className="small">{L("Hatua inayofuata", "Next step")}<input value={i.next} maxLength={160} onChange={(e) => m.saveIssue({ ...i, next: e.target.value })} /></label>
      <div className="row"><button className="btn ghost small" onClick={() => setBrief(i)}><FileText size={15} aria-hidden /> {L("Muhtasari wa sera", "Policy brief")}</button>
        <button className="icon" aria-label={L("Futa suala", "Delete issue")} onClick={() => { if (confirm(L("Futa suala hili?", "Delete this issue?"))) m.deleteIssue(i.id); }}><Trash2 size={15} aria-hidden /></button></div>
    </section>)}
    <section className="card">
      <h2>{L("Suala jipya la utetezi", "New advocacy issue")}</h2>
      <div className="form-grid">
        <label>{L("Suala", "Issue")}<input value={d.title} maxLength={120} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
        <label>{L("Ngazi", "Level")}<select value={d.level} onChange={(e) => setD({ ...d, level: e.target.value })}>{LEVELS.map(([k, n]) => <option key={k} value={k}>{Tx(n)}</option>)}</select></label>
        <label>{L("Mtoa uamuzi (wadhifa, si jina)", "Decision maker (role, not name)")}<input value={d.target} maxLength={80} onChange={(e) => setD({ ...d, target: e.target.value })} /></label>
        <label>{L("Ombi mahususi", "Specific ask")}<input value={d.ask} maxLength={200} onChange={(e) => setD({ ...d, ask: e.target.value })} /></label>
      </div>
      <p className="small"><b>{L("Ushahidi kutoka viashiria", "Evidence from indicators")}</b></p>
      <div className="chips wrap">{m.indicators.map((x) => <button key={x.id} aria-pressed={d.evidence.includes(x.id)} onClick={() => setD({ ...d, evidence: d.evidence.includes(x.id) ? d.evidence.filter((e) => e !== x.id) : [...d.evidence, x.id] })}>{Tx(METRICS[x.metric].name)}</button>)}</div>
      <button className="btn" disabled={!d.title.trim() || !d.ask.trim()} onClick={() => { m.saveIssue({ ...d, id: `a${Date.now().toString(36)}` }); setD(blankIssue()); }}><Plus size={16} aria-hidden /> {L("Ongeza suala", "Add issue")}</button>
    </section>
  </div>;
}

function PolicyBrief({ issue, onBack }: { issue: Issue; onBack: () => void }) {
  const L = useL(), Tx = useT();
  const m = useMel();
  const ev = issue.evidence.map((e) => m.indicators.find((x) => x.id === e)).filter(Boolean) as Indicator[];
  const total = (k: MetricKey) => fmt(metric(k, m.all, m.issues), METRICS[k].unit);
  return <div className="stack">
    <div className="row no-print"><button className="btn ghost small" onClick={onBack}>← {L("Rudi", "Back")}</button><button className="btn small" onClick={() => print()}><Printer size={15} aria-hidden /> {L("Chapisha / PDF", "Print / PDF")}</button></div>
    <article className="card brief">
      <p className="muted small">{L("Muhtasari wa sera", "Policy brief")} · {label(LEVELS, issue.level, Tx)} · {new Date().toISOString().slice(0, 10)}</p>
      <h2>{issue.title}</h2>
      <p><b>{L("Kwa", "To")}:</b> {issue.target}</p>
      <h3>{L("Tunaomba", "Our ask")}</h3><p>{issue.ask}</p>
      <h3>{L("Ushahidi kutoka jamii", "Evidence from the community")}</h3>
      <ul>{ev.map((i) => { const val = metric(i.metric, m.all, m.issues); return <li key={i.id}>{Tx(METRICS[i.metric].name)}: <b>{fmt(val, METRICS[i.metric].unit)}</b> ({L("lengo", "target")} {fmt(i.target, METRICS[i.metric].unit)}, {L("chanzo", "source")}: {Tx(i.source)})</li>; })}</ul>
      <h3>{L("Picha pana", "The wider picture")}</h3>
      <p>{L(`Kaya ${total("households")} zimefikiwa. ${total("paid")} zimefika kwa kaya, ${total("onTime")} kwa wakati. Alama ya urejeshaji wa ardhi ni ${total("regen")}. Watu ${total("reached")} wamefundishwa.`, `${total("households")} households reached. ${total("paid")} has reached households, ${total("onTime")} on time. The land regeneration score is ${total("regen")}. ${total("reached")} people have been trained.`)}</p>
      <h3>{L("Hatua inayofuata", "Next step")}</h3><p>{issue.next || "—"}</p>
      {m.showSample && <p className="warn small">{L("Inajumuisha data ya mfano ya kubuni. Izime kwenye dashibodi kabla ya kutuma.", "Includes fictional sample data. Turn it off on the dashboard before sending.")}</p>}
      <p className="muted small">{L("Data imekusanywa na jamii kwa zana za Jamii Learn Companion. Rekodi zinapatikana kwa ukaguzi.", "Data collected by the community with Jamii Learn Companion tools. Records are available for checking.")}</p>
    </article>
  </div>;
}
