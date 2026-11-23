// Six Bricks games, after Enkaji Play: one guide, six coloured bricks, look-remember-build, levels, stars and badges,
// and every game also playable with real bricks or stones when there is no phone.
import { useEffect, useMemo, useState } from "react";
import { o, type T } from "../shared/content";
import { useL, useT } from "./core";

export const BRICK = { r: "#E53935", o: "#FB8C00", y: "#FDD835", g: "#43A047", p: "#29B6F6", b: "#1E88E5" } as const;
type K = keyof typeof BRICK;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const best = (id: string) => { try { return Number(localStorage.getItem(`jlc-best-${id}`)) || 0; } catch { return 0; } };
const keepBest = (id: string, n: number) => { try { if (n > best(id)) localStorage.setItem(`jlc-best-${id}`, String(n)); } catch { /* not remembered */ } };
const Brick = ({ k, label }: { k: K; label?: string }) => <span className="brick" style={{ background: BRICK[k] }}>{label}</span>;

/* ---------- Follow the Shilling: look, remember, rebuild the money tower ---------- */
const STEPS: { k: K; name: T }[] = [
  { k: "r", name: o("Mnunuzi analipa", "Buyer pays") },
  { k: "o", name: o("Dalali", "Broker") },
  { k: "y", name: o("Mkaguzi na rejista", "Auditor and registry") },
  { k: "p", name: o("Gharama za mwekezaji", "Developer costs") },
  { k: "g", name: o("Akaunti ya jamii", "Community account") },
  { k: "b", name: o("Kaya, kwa M-Pesa", "Household, by M-Pesa") },
];
export function Shilling({ say }: { say: (s: string) => void }) {
  const L = useL(), Tx = useT();
  const [level, setLevel] = useState(1), [phase, setPhase] = useState<"look" | "build" | "won" | "miss" | "done">("look"), [mine, setMine] = useState<number[]>([]), [stars, setStars] = useState(0), [round, setRound] = useState(0);
  const again = (lvl: number) => { setLevel(lvl); setMine([]); setRound((r) => r + 1); setPhase("look"); };
  // Level 1 shows 3 steps, level 4 all 6. Steps always appear in the order money flows, bottom to top.
  const target = useMemo(() => {
    const n = Math.min(6, level + 2), pick = new Set([0, 5]);
    while (pick.size < n) pick.add(1 + Math.floor(Math.random() * 4));
    return [...pick].sort((a, b) => a - b);
  }, [level, round]);
  useEffect(() => {
    if (phase !== "look") return;
    let live = true;
    say(L("Tazama mnara wa pesa. Kumbuka hatua zake!", "Look at the money tower. Remember its steps!"));
    wait(2500 + target.length * 700).then(() => { if (live) { setPhase("build"); say(L("Sasa ujenge! Anza chini: pesa inaanzia wapi?", "Now you build it! Start at the bottom: where does the money start?")); } });
    return () => { live = false; };
  }, [phase, target]);
  const add = (i: number) => {
    const next = [...mine, i];
    setMine(next);
    if (next[next.length - 1] !== target[next.length - 1]) { setPhase("miss"); say(L(`Karibu! Hatua ${next.length} ilikuwa "${Tx(STEPS[target[next.length - 1]].name)}". Pesa ikiruka hatua, uliza kwa nini.`, `Close! Step ${next.length} was "${Tx(STEPS[target[next.length - 1]].name)}". If money skips a step, ask why.`)); return; }
    if (next.length === target.length) {
      const s = stars + 1; setStars(s); keepBest("shilling", s);
      if (level >= 4) { setPhase("done"); say(L(`Hongera! Nyota ${s}. Umefuata kila shilingi kutoka kwa mnunuzi hadi nyumbani.`, `Well done! ${s} stars. You followed every shilling from the buyer to the home.`)); }
      else { setPhase("won"); say(L("Safi! Mnara sahihi. Kiwango kijacho kina hatua zaidi.", "Great! The tower is right. The next level has more steps.")); }
    }
  };
  const Tower = ({ ids }: { ids: number[] }) => <div className="dtower">{[...ids].reverse().map((i, n) => <Brick key={n} k={STEPS[i].k} label={Tx(STEPS[i].name)} />)}</div>;
  return <div className="stack">
    <p className="pill">{L(`Kiwango ${level} kati ya 4`, `Level ${level} of 4`)} · ★ {stars}</p>
    <div className="towers">
      <div className="tw">{phase === "look" ? <Tower ids={target} /> : <div className="dtower covered" aria-label={L("Mnara umefunikwa", "Tower covered")} />}<small>{L("Mnara wa pesa", "Money tower")}</small></div>
      <div className="tw"><Tower ids={mine} /><small>{L("Mnara wako", "Your tower")}</small></div>
    </div>
    {phase === "build" && <div className="palette">{STEPS.map((s, i) => <button key={s.k} className="pal" style={{ background: BRICK[s.k] }} onClick={() => add(i)}>{Tx(s.name)}</button>)}</div>}
    {phase === "build" && mine.length > 0 && <button className="btn ghost small" onClick={() => setMine(mine.slice(0, -1))}>↩ {L("Rudisha", "Undo")}</button>}
    {phase === "won" && <button className="btn" onClick={() => again(level + 1)}>{L("Kiwango kijacho", "Next level")}</button>}
    {phase === "miss" && <button className="btn" onClick={() => again(level)}>{L("Tazama tena", "Look again")}</button>}
    {phase === "done" && <button className="btn" onClick={() => { setStars(0); again(1); }}>{L("Cheza tena", "Play again")}</button>}
  </div>;
}

/* ---------- Rotate the Herd: grass bricks recover only when paddocks rest ---------- */
export function graze(grass: number[], pick: number, drought: boolean) {
  const fed = grass[pick] >= 3;
  const next = grass.map((g, i) => (i === pick ? Math.max(0, g - 3) : drought ? g : Math.min(6, g + 1)));
  return { grass: next, fed };
}
const SEASONS = 8;
export function Herd({ say }: { say: (s: string) => void }) {
  const L = useL();
  const dry = useMemo(() => 2 + Math.floor(Math.random() * 5), []);
  const [grass, setGrass] = useState([4, 4, 4, 4]), [season, setSeason] = useState(0), [fed, setFed] = useState(0), [last, setLast] = useState(-1);
  const names = [L("Kilima", "Hill"), L("Mto", "River"), L("Bonde", "Valley"), L("Mpakani", "Border")];
  const over = season >= SEASONS;
  useEffect(() => { say(L("Chagua kipande cha malisho kwa msimu huu. Kipande kilichopumzika kinaota tena.", "Pick a paddock for this season. Rested paddocks grow back.")); }, []);
  const go = (i: number) => {
    const drought = season === dry;
    const r = graze(grass, i, drought);
    const f = fed + (r.fed ? 1 : 0);
    setGrass(r.grass); setFed(f); setSeason(season + 1); setLast(i);
    if (season + 1 >= SEASONS) {
      const stars = f + Math.round(r.grass.reduce((a, b) => a + b, 0) / 6);
      keepBest("herd", stars);
      say(L(`Mwisho! Mifugo ilishiba misimu ${f} kati ya ${SEASONS}. Nyota ${stars}. Malisho kwa zamu yanalinda ardhi na malipo ya kaboni.`, `Done! The herd ate well for ${f} of ${SEASONS} seasons. ${stars} stars. Rotation protects the land and the carbon payout.`));
    } else if (drought) say(L("Ukame! Hakuna kipande kilichoota msimu huu.", "Drought! No paddock grew back this season."));
    else if (!r.fed) say(L("Mifugo ina njaa: kipande hicho kilikuwa na nyasi kidogo. Ardhi tupu inaumiza udongo.", "The herd is hungry: that paddock had too little grass. Bare ground hurts the soil."));
    else if (i === last) say(L("Umerudi kipande kile kile. Kumbuka kukipumzisha.", "Same paddock again. Remember to let it rest."));
    else say(L("Vizuri! Mifugo imeshiba na vipande vingine vinapumzika.", "Good! The herd ate and the other paddocks rest."));
  };
  return <div className="stack">
    <p className="pill">{over ? L("Mchezo umekwisha", "Game over") : L(`Msimu ${season + 1} kati ya ${SEASONS}`, `Season ${season + 1} of ${SEASONS}`)} · {L("Imeshiba", "Fed")} {fed}</p>
    <div className="paddocks">{grass.map((g, i) => (
      <button key={i} className="paddock" disabled={over} aria-label={L(`${names[i]}: matofali ${g} ya nyasi`, `${names[i]}: ${g} grass bricks`)} onClick={() => go(i)}>
        <span className="dtower">{Array.from({ length: g }, (_, n) => <span key={n} className="brick" style={{ background: n < 2 ? BRICK.y : BRICK.g }} />)}{g === 0 && <span className="bare">{L("tupu", "bare")}</span>}</span>
        <b>{names[i]}</b>{last === i && <small>🐄</small>}
      </button>))}
    </div>
    {over && <button className="btn" onClick={() => { setGrass([4, 4, 4, 4]); setSeason(0); setFed(0); setLast(-1); }}>{L("Cheza tena", "Play again")}</button>}
  </div>;
}

/* ---------- Badges and real-brick versions ---------- */
export const BADGES: { id: string; icon: string; name: T; how: T; got: () => boolean }[] = [
  { id: "shilling", icon: "🪙", name: o("Mfuatiliaji wa Shilingi", "Shilling Tracker"), how: o("Maliza viwango vyote vya Fuata Shilingi", "Finish every level of Follow the Shilling"), got: () => best("shilling") >= 4 },
  { id: "herd", icon: "🐄", name: o("Mpangaji wa Malisho", "Grazing Planner"), how: o("Pata nyota 10 katika Zungusha Mifugo", "Get 10 stars in Rotate the Herd"), got: () => best("herd") >= 10 },
  { id: "share", icon: "➗", name: o("Mwerevu wa Mgao", "Share Smart"), how: o("Pata 4 au zaidi katika Hesabu ya Mgao", "Score 4 or more in Work out the Share"), got: () => best("share") >= 4 },
  { id: "flags", icon: "🚩", name: o("Mwona Bendera", "Flag Spotter"), how: o("Maliza Bendera Nyekundu", "Finish Red Flags"), got: () => best("flags") > 0 },
  { id: "words", icon: "🧠", name: o("Mlinzi wa Maneno", "Word Keeper"), how: o("Maliza Linganisha Maneno", "Finish Match the Words"), got: () => best("match") > 0 },
];
export const OFFLINE: Record<string, T> = {
  shilling: o("Bila simu: tumia matofali au mawe sita yenye rangi. Mmoja anajenga mnara wa hatua za pesa na kuufunika kwa shuka; wengine wanaujenga upya na kueleza kila hatua.", "No phone: use six coloured bricks or stones. One person builds the money-step tower and covers it with a shuka; the others rebuild it and explain each step."),
  herd: o("Bila simu: chora vipande vinne ardhini, weka mawe manne kila kimoja. Kila msimu toa mawe matatu kipande kilichochaguliwa, ongeza moja kwa vingine.", "No phone: draw four paddocks on the ground with four stones each. Each season take three stones from the chosen paddock and add one to the others."),
  share: o("Bila simu: maharagwe kumi ni mapato. Toa ya gharama, kisha gawa 4 kati ya 10 ya yaliyobaki kwa jamii.", "No phone: ten beans are the earnings. Remove the costs, then give 4 in 10 of what is left to the community."),
  flags: o("Bila simu: soma kifungu kwa sauti; kila mtu anainua kitambaa chekundu kama anataka kuuliza zaidi.", "No phone: read a clause aloud; everyone raises a red cloth if they want to ask more."),
  match: o("Bila simu: andika maneno na maana kwenye vipande vya karatasi, vigeuze, chezeni kumbukumbu.", "No phone: write words and meanings on paper slips, turn them over and play memory."),
};
