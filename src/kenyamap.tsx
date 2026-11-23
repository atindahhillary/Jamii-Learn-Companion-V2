import { useState } from "react";
import { COUNTY_SHAPES, MAP_H, MAP_W } from "../shared/kenya-counties";
import { ASAL_NOTE, ASAL_SOURCES, SINK_TYPES, asalOf, sinksIn, sitesIn } from "../shared/kenya-map";
import { useL, useT } from "./core";

const FILL = { arid: "#e9b949", semi: "#f6dfa0", none: "#dfe9d8" };
type Layer = "asal" | "restore" | "sinks";

// A plain SVG map: no map service, so it works offline and inside the app's strict security policy.
export function KenyaMap({ region, setRegion, withData }: { region: string; setRegion: (c: string) => void; withData: Set<string> }) {
  const L = useL(), Tx = useT();
  const [on, setOn] = useState<Record<Layer, boolean>>({ asal: true, restore: true, sinks: true });
  const [picked, setPicked] = useState<string>(region && region !== "none" ? region : "");
  const names = Object.keys(COUNTY_SHAPES).sort();
  const describe = (c: string) => {
    const a = asalOf(c), r = sitesIn(c).length, s = sinksIn(c).length;
    return `${c}: ${a === "arid" ? L("kame", "arid") : a === "semi" ? L("nusu kame", "semi-arid") : L("si ASAL", "not ASAL")}, ${L(`urejeshaji ${r}`, `${r} restoration`)}, ${L(`vyanzo vya kaboni ${s}`, `${s} carbon sinks`)}`;
  };
  const sel = picked || "";
  return <section className="card">
    <div className="row-between wrap"><h2>{L("Ramani ya Kenya: ASAL, urejeshaji na vyanzo vya kaboni", "Kenya map: ASALs, restoration and carbon sinks")}</h2>
      <div className="chips wrap" role="group" aria-label={L("Tabaka za ramani", "Map layers")}>
        {([["asal", L("ASAL", "ASALs")], ["restore", L("Urejeshaji", "Restoration")], ["sinks", L("Vyanzo vya kaboni", "Carbon sinks")]] as [Layer, string][]).map(([k, n]) =>
          <button key={k} aria-pressed={on[k]} onClick={() => setOn({ ...on, [k]: !on[k] })}>{n}</button>)}
      </div></div>
    <div className="map-wrap">
      <svg className="kmap" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="group" aria-label={L("Ramani ya kaunti za Kenya", "Map of Kenya's counties")}>
        {names.map((c) => {
          const s = COUNTY_SHAPES[c], a = asalOf(c);
          return <path key={c} d={s.d} fill={on.asal ? FILL[a ?? "none"] : FILL.none} className="county" data-sel={c === sel || c === region}
            role="button" tabIndex={0} aria-label={describe(c)} onClick={() => setPicked(c)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked(c); } }}><title>{describe(c)}</title></path>;
        })}
        {names.map((c) => {
          const s = COUNTY_SHAPES[c], r = sitesIn(c).length, k = sinksIn(c).length;
          return <g key={c} pointerEvents="none">
            {on.restore && r > 0 && <g transform={`translate(${s.cx - (on.sinks && k ? 20 : 0)},${s.cy})`}><circle r="19" className="dot-restore" /><text className="dot-n" y="8">{r}</text></g>}
            {on.sinks && k > 0 && <g transform={`translate(${s.cx + (on.restore && r ? 20 : 0)},${s.cy})`}><circle r="19" className="dot-sink" /><text className="dot-n" y="8">{k}</text></g>}
            {withData.has(c) && <circle cx={s.cx} cy={s.cy + 28} r="7" className="dot-data" />}
          </g>;
        })}
      </svg>
      <div className="map-side">
        <ul className="map-legend plain small">
          {on.asal && <><li><i style={{ background: FILL.arid }} /> {L("Kaunti kame (9)", "Arid county (9)")}</li><li><i style={{ background: FILL.semi }} /> {L("Kaunti nusu kame (14)", "Semi-arid county (14)")}</li></>}
          {on.restore && <li><i className="dot-restore" /> {L("Miradi ya urejeshaji iliyorekodiwa", "Documented restoration")}</li>}
          {on.sinks && <li><i className="dot-sink" /> {L("Vyanzo vikuu vya kaboni", "Main carbon sinks")}</li>}
          <li><i className="dot-data" /> {L("Kaunti zenye rekodi zenu", "Counties with your records")}</li>
        </ul>
        <label className="small">{L("Au chagua kaunti", "Or pick a county")}<select value={sel} onChange={(e) => setPicked(e.target.value)}><option value="">—</option>{names.map((c) => <option key={c}>{c}</option>)}</select></label>
        {sel ? <div className="stack-sm county-card">
          <h3>{sel}</h3>
          <p className="small"><span className="pill">{asalOf(sel) === "arid" ? L("ASAL: kame", "ASAL: arid") : asalOf(sel) === "semi" ? L("ASAL: nusu kame", "ASAL: semi-arid") : L("Si ASAL kwenye orodha rasmi", "Not on the official ASAL list")}</span></p>
          {sitesIn(sel).length > 0 && <><b className="small">{L("Urejeshaji", "Restoration")}</b><ul className="plain small">{sitesIn(sel).map((x) => <li key={x.id}>• {Tx(x.what)} <span className="muted">({x.who}) <a href={x.source} target="_blank" rel="noopener noreferrer">{L("chanzo", "source")}</a></span></li>)}</ul></>}
          {sinksIn(sel).length > 0 && <><b className="small">{L("Vyanzo vya kaboni", "Carbon sinks")}</b><ul className="plain small">{sinksIn(sel).map((x) => <li key={x.id}>• <b>{x.name}</b> ({Tx(SINK_TYPES[x.type])}{x.approx ? L(", kaunti ni za kukadiria", ", counties approximate") : ""}): {Tx(x.fact)} <a href={x.source} target="_blank" rel="noopener noreferrer">{L("chanzo", "source")}</a></li>)}</ul></>}
          {!sitesIn(sel).length && !sinksIn(sel).length && <p className="muted small">{L("Hatuna mfano uliorekodiwa hapa bado. Rekodi za jamii yenu zinaweza kujaza pengo hili.", "No documented example here yet. Your community's records can fill this gap.")}</p>}
          <div className="row">
            <button className="btn small" onClick={() => setRegion(sel)} disabled={region === sel}>{region === sel ? L("Dashibodi inaonyesha kaunti hii", "Dashboard shows this county") : L(`Onyesha dashibodi ya ${sel}`, `Filter dashboard to ${sel}`)}</button>
            {region && <button className="btn ghost small" onClick={() => setRegion("")}>{L("Kaunti zote", "All counties")}</button>}
          </div>
        </div> : <p className="muted small">{L("Gusa kaunti kwenye ramani kuona maelezo.", "Tap a county on the map to see details.")}</p>}
        <p className="muted small">{Tx(ASAL_NOTE)} {ASAL_SOURCES.map(([n, u], i) => <span key={u}>{i ? " · " : ""}<a href={u} target="_blank" rel="noopener noreferrer">{n}</a></span>)}</p>
        <p className="muted small">{L("Mipaka: geoBoundaries (RCMRD 2020, kikoa cha umma), imerahisishwa. Hali za miradi ya kaboni hubadilika: angalia rejista kabla ya kuamua.", "Boundaries: geoBoundaries (RCMRD 2020, public domain), simplified. Carbon project status changes: check the registry before deciding.")}</p>
      </div>
    </div>
  </section>;
}
