// The six pillars from the November 2026 expert meeting: money trail, household change, economics,
// knowledge pathways, regeneration monitoring and clever farming. Pure functions + bilingual content,
// so the PWA, tests and (later) the server and WhatsApp bot can share them.
import { o, type T } from "./content.js";

/* ---------------- 1. Money trail: every shilling from credit sale to household ---------------- */

export type Ledger = {
  tonnes: number;          // credits issued for the year
  bufferPct: number;       // held back in the buffer pool, not sold
  priceUsd: number;        // per tonne
  fx: number;              // KES per USD
  brokerPct: number;       // sales / broker fee, % of gross
  verifyKes: number;       // verification, registry and audit
  opsKes: number;          // developer's other cost of doing business
  landBased: boolean;      // reg 29: 40% land-based, 25% not
  split: { reserve: number; projects: number; committee: number; households: number }; // % of community share
  households: number;
};

export const LEDGER_EXAMPLE: Ledger = {
  tonnes: 20000, bufferPct: 15, priceUsd: 10, fx: 129, brokerPct: 8, verifyKes: 2_500_000, opsKes: 6_000_000,
  landBased: true, split: { reserve: 15, projects: 35, committee: 5, households: 45 }, households: 600,
};

export type Line = { id: string; label: T; kes: number; holder: T; proof: T; level: 0 | 1 | 2 };

const r = (n: number) => Math.round(n);

export function ledger(x: Ledger) {
  const sold = x.tonnes * (1 - x.bufferPct / 100);
  const gross = r(sold * x.priceUsd * x.fx);
  const broker = r(gross * x.brokerPct / 100);
  const costs = broker + x.verifyKes + x.opsKes;
  const net = Math.max(0, gross - costs);
  const sharePct = x.landBased ? 40 : 25;
  const community = r(net * sharePct / 100);
  const developer = gross - costs - community; // may go negative if costs exceed gross; shown as a warning
  const splitTotal = x.split.reserve + x.split.projects + x.split.committee + x.split.households;
  const part = (p: number) => r(community * p / Math.max(1, splitTotal));
  const reserve = part(x.split.reserve), projects = part(x.split.projects), committee = part(x.split.committee);
  const households = community - reserve - projects - committee; // remainder, so the pieces always add up
  const perHousehold = x.households > 0 ? r(households / x.households) : 0;
  const lines: Line[] = [
    { id: "gross", level: 0, kes: gross, label: o(`Mauzo: tani ${r(sold).toLocaleString()} zilizouzwa`, `Sale: ${r(sold).toLocaleString()} tonnes sold`), holder: o("Mwekezaji anapokea kutoka kwa mnunuzi", "Developer receives from the buyer"), proof: o("Rekodi ya rejista ya kustaafisha na ankara ya mauzo", "Registry retirement record and sale invoice") },
    { id: "broker", level: 1, kes: broker, label: o("Ada ya dalali / mauzo", "Broker / sales fee"), holder: o("Dalali", "Broker"), proof: o("Mkataba wa dalali na risiti", "Broker contract and receipt") },
    { id: "verify", level: 1, kes: x.verifyKes, label: o("Uhakiki, rejista na ukaguzi", "Verification, registry and audit"), holder: o("Mkaguzi na rejista", "Auditor and registry"), proof: o("Ankara za mkaguzi na ada za rejista", "Auditor invoices and registry fees") },
    { id: "ops", level: 1, kes: x.opsKes, label: o("Gharama nyingine za kufanya biashara", "Other cost of doing business"), holder: o("Mwekezaji", "Developer"), proof: o("Orodha ya gharama yenye risiti, iliyokaguliwa", "Itemised, audited cost list with receipts") },
    { id: "community", level: 0, kes: community, label: o(`Mgao wa jamii: ${sharePct}% ya mapato baada ya gharama`, `Community share: ${sharePct}% of earnings after costs`), holder: o("Akaunti ya jamii (CDA)", "Community account (CDA)"), proof: o("Taarifa ya benki ya akaunti ya jamii", "Bank statement of the community account") },
    { id: "reserve", level: 2, kes: reserve, label: o("Akiba ya utulivu (miaka mibaya)", "Stability reserve (bad years)"), holder: o("Akaunti ya akiba ya jamii", "Community reserve account"), proof: o("Salio la akiba kila robo mwaka", "Reserve balance every quarter") },
    { id: "projects", level: 2, kes: projects, label: o("Miradi ya jamii (maji, shule, afya)", "Community projects (water, school, health)"), holder: o("Kamati ya miradi", "Projects committee"), proof: o("Mpango ulioidhinishwa na baraza, risiti na picha", "Assembly-approved plan, receipts and photos") },
    { id: "committee", level: 2, kes: committee, label: o("Uendeshaji wa kamati", "Committee running costs"), holder: o("Kamati ya CDA", "CDA committee"), proof: o("Bajeti ya kamati iliyosomwa hadharani", "Committee budget read out in public") },
    { id: "households", level: 2, kes: households, label: o(`Malipo ya moja kwa moja kwa kaya ${x.households}`, `Direct payments to ${x.households} households`), holder: o("Kaya, kupitia M-Pesa au benki", "Households, via M-Pesa or bank"), proof: o("Orodha ya malipo yenye majina na nambari za muamala", "Payment list with names and transaction codes") },
    { id: "developer", level: 0, kes: developer, label: o("Kinachobaki kwa mwekezaji", "Kept by the developer"), holder: o("Mwekezaji", "Developer"), proof: o("Ripoti ya mwaka ya mapato (CDA)", "Annual earnings report (CDA)") },
  ];
  const warnings: T[] = [];
  if (splitTotal !== 100) warnings.push(o(`Mgawanyo wa mgao wa jamii unajumlisha ${splitTotal}%, si 100%.`, `The community split adds up to ${splitTotal}%, not 100%.`));
  if (gross > 0 && costs / gross > 0.5) warnings.push(o("Gharama ni zaidi ya nusu ya mauzo. Omba orodha ya gharama iliyokaguliwa kabla ya kukubali.", "Costs are over half of the sale. Ask for an audited cost list before agreeing."));
  if (developer < 0) warnings.push(o("Gharama zimezidi mauzo: hakuna mapato ya kugawa mwaka huu.", "Costs exceed the sale: there are no earnings to share this year."));
  return { sold: r(sold), gross, costs, net, sharePct, community, developer, reserve, projects, committee, households, perHousehold, perMonth: r(perHousehold / 12), lines, warnings };
}

/* ---------------- Reliable payouts: a reserve rule that smooths good and bad years ---------------- */

// Each year a share of the household pot goes to reserve; in a weak year the reserve tops payments up towards a floor.
export function smooth(pots: number[], keepPct: number, floorPct = 80) {
  let reserve = 0;
  const paid: number[] = [];
  pots.forEach((pot, i) => {
    let pay = pot * (1 - keepPct / 100);
    reserve += pot - pay;
    const avg = i === 0 ? pot : pots.slice(0, i).reduce((a, b) => a + b, 0) / i;
    const floor = avg * (1 - keepPct / 100) * (floorPct / 100); // a share of what a usual year pays
    if (pay < floor) { const top = Math.min(reserve, floor - pay); pay += top; reserve -= top; }
    paid.push(r(pay));
  });
  return { paid, reserve: r(reserve) };
}
// Year shapes for the reliability chart: a normal year, a good one, a drought, recovery, a strong market.
export const YEARS: { label: T; factor: number }[] = [
  { label: o("Mwaka 1", "Year 1"), factor: 1 }, { label: o("Mwaka 2", "Year 2"), factor: 1.15 },
  { label: o("Mwaka 3 (ukame)", "Year 3 (drought)"), factor: 0.45 }, { label: o("Mwaka 4", "Year 4"), factor: 0.85 },
  { label: o("Mwaka 5", "Year 5"), factor: 1.2 },
];
export const spread = (a: number[]) => (a.length ? Math.max(...a) - Math.min(...a) : 0);

/* ---------------- 2. Household theory of change ---------------- */

export type Stage = { id: string; name: T; example: T; indicator: T; assumption: T };
export const TOC: Stage[] = [
  { id: "learn", name: o("Kujifunza", "Learning"), example: o("Mama na baba wanajifunza mkopo wa kaboni ni nini na mgao unahesabiwaje.", "Both mother and father learn what a credit is and how the share is worked out."), indicator: o("Watu wazima wangapi katika kaya wamemaliza masomo", "Adults in the household who finished the lessons"), assumption: o("Mafunzo yako kwa lugha yao na kwa wakati wanaoweza", "Training is in their language and at times they can attend") },
  { id: "decide", name: o("Kuamua pamoja", "Deciding together"), example: o("Kaya inaamua pamoja jinsi ya kutumia malipo na kushiriki mkutano wa CDA.", "The household decides together how to use payments and attends the CDA meeting."), indicator: o("Je, mwanamke anashiriki uamuzi wa matumizi?", "Does the woman take part in spending decisions?"), assumption: o("Malipo yanafika kwa jina la mwanamke au kwa wote wawili", "Payments reach the woman's name or both names") },
  { id: "practice", name: o("Kubadilisha mazoea", "Changing practice"), example: o("Malisho kwa zamu, benki ya lishe, mashimo ya zai.", "Rotational grazing, a fodder bank, zai pits."), indicator: o("Mazoea mapya yanayotumika msimu huu", "New practices in use this season"), assumption: o("Kuna ardhi, wafanyakazi na pembejeo za kuanza", "There is land, labour and inputs to start") },
  { id: "land", name: o("Ardhi na mifugo", "Land and herd"), example: o("Nyasi zaidi, udongo mtupu kidogo, mifugo yenye afya katika kiangazi.", "More grass, less bare ground, healthier animals through the dry season."), indicator: o("Alama ya urejeshaji kwenye kipimo cha ardhi", "Regeneration score on the land monitor"), assumption: o("Mvua si mbaya kupita kiasi; jamii nzima inafuata mpango", "Rain is not extreme; the whole community follows the plan") },
  { id: "income", name: o("Mapato na malipo", "Income and payouts"), example: o("Malipo ya kaboni yanayotabirika pamoja na maziwa na lishe ya kuuza.", "Predictable carbon payouts plus milk and fodder to sell."), indicator: o("Malipo ya kaya kwa mwaka na tofauti kati ya miaka", "Household payout per year and the gap between years"), assumption: o("Mnunuzi analipa; gharama zinakaguliwa; akiba ipo", "The buyer pays; costs are audited; the reserve exists") },
  { id: "wellbeing", name: o("Ustawi wa kaya", "Household wellbeing"), example: o("Ada za shule kwa wakati, maji karibu, akiba ya chama.", "School fees on time, water nearby, savings in a chama."), indicator: o("Miezi bila njaa; watoto shuleni; akiba", "Months without hunger; children in school; savings"), assumption: o("Pesa haitumiwi na mtu mmoja peke yake", "Money is not controlled by one person alone") },
  { id: "future", name: o("Kizazi kijacho", "Next generation"), example: o("Watoto wanajua kupima ardhi na kusoma mkataba; ardhi bora inarithiwa.", "Children can monitor land and read an agreement; better land is inherited."), indicator: o("Vijana wanaoshiriki ufuatiliaji na kamati", "Youth taking part in monitoring and committees"), assumption: o("Mkataba unaweza kurekebishwa na kizazi kijacho", "The agreement can be amended by the next generation") },
];

export type Bucket = { id: string; name: T; horizon: "now" | "soon" | "long"; land: boolean; feeds: string[] };
export const BUCKETS: Bucket[] = [
  { id: "school", name: o("Ada za shule", "School fees"), horizon: "long", land: false, feeds: ["wellbeing", "future"] },
  { id: "water", name: o("Maji (tanki, mfereji)", "Water (tank, gutters)"), horizon: "soon", land: true, feeds: ["wellbeing", "land"] },
  { id: "herd", name: o("Lishe na afya ya mifugo", "Fodder and herd health"), horizon: "soon", land: true, feeds: ["land", "income"] },
  { id: "save", name: o("Akiba ya chama", "Chama savings"), horizon: "long", land: false, feeds: ["income", "wellbeing"] },
  { id: "regen", name: o("Kurejesha ardhi (mbegu, miche)", "Land regeneration (seed, seedlings)"), horizon: "long", land: true, feeds: ["land", "future"] },
  { id: "food", name: o("Chakula na afya", "Food and health"), horizon: "now", land: false, feeds: ["wellbeing"] },
];

// Honest feedback on a household split; no single right answer.
export function splitAdvice(shares: Record<string, number>): T[] {
  const total = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
  const pct = (id: string) => (shares[id] ?? 0) / total * 100;
  const tips: T[] = [];
  if (pct("save") === 0) tips.push(o("Hakuna akiba: mwaka wa ukame malipo yakishuka, kaya itaumia.", "No savings: in a drought year when payouts drop, the household will feel it."));
  const land = BUCKETS.filter((b) => b.land).reduce((a, b) => a + pct(b.id), 0);
  if (land < 20) tips.push(o("Chini ya 20% inarudi ardhini. Ardhi ndiyo inayozalisha malipo ya kesho.", "Under 20% goes back into the land. The land is what earns tomorrow's payout."));
  if (pct("food") > 50) tips.push(o("Zaidi ya nusu ni ya leo. Hilo ni sawa wakati wa shida, lakini panga mwaka ujao.", "Over half is for today. That is fine in hard times, but plan for next year."));
  if (!tips.length) tips.push(o("Mgawanyo wenye uwiano: leo, kesho na ardhi vyote vimepata.", "A balanced split: today, tomorrow and the land all receive something."));
  return tips;
}

/* ---------------- 3. Economics of change ---------------- */

export type Econ = { payout: number; lostIncome: number; labourDays: number; dayWage: number; newIncome: number; rampYears: number; years: number; discountPct: number; localPct: number };
export const ECON_EXAMPLE: Econ = { payout: 3500, lostIncome: 4000, labourDays: 10, dayWage: 400, newIncome: 12000, rampYears: 3, years: 10, discountPct: 10, localPct: 60 };

export function econ(x: Econ) {
  const rows = Array.from({ length: x.years }, (_, i) => {
    const ramp = Math.min(1, (i + 1) / Math.max(1, x.rampYears)); // new practices pay off gradually
    const gain = x.payout + x.newIncome * ramp;
    const cost = x.lostIncome + x.labourDays * x.dayWage;
    return { year: i + 1, gain: r(gain), cost: r(cost), net: r(gain - cost) };
  });
  let cum = 0;
  const withCum = rows.map((row) => ({ ...row, cum: (cum += row.net) }));
  const npv = r(rows.reduce((a, row) => a + row.net / Math.pow(1 + x.discountPct / 100, row.year), 0));
  const breakEven = withCum.find((row) => row.cum > 0)?.year ?? null;
  const s = Math.min(0.95, Math.max(0, x.localPct / 100));
  const multiplier = +(1 + s + s * s).toFixed(2); // three spending rounds (LM3 idea); an illustration, not a forecast
  return { rows: withCum, npv, breakEven, multiplier };
}

// Economies of scale: shared monitoring and admin costs fall per household as more join.
export const perHouseholdCost = (fixed: number, perHh: number, n: number) => (n > 0 ? r(fixed / n + perHh) : 0);

/* ---------------- 4. Knowledge pathways ---------------- */

export type Path = { id: string; who: T; need: T[]; act: T[]; evidence: T; tool: string };
export const PATHS: Path[] = [
  { id: "community", who: o("Jamii na kaya", "Community and households"),
    need: [o("Mkopo, mgao na mkataba kwa lugha yao", "Credits, shares and the agreement in their own language"), o("Haki ya kusema ndiyo au hapana", "The right to say yes or no"), o("Kupima ardhi yao wenyewe", "How to monitor their own land")],
    act: [o("Kuhudhuria na kuuliza katika mikutano ya CDA", "Attend and ask at CDA meetings"), o("Kufuatilia malipo kwa njia ya pesa", "Follow payments with the money trail"), o("Kupima kipande cha ardhi kila msimu", "Monitor a plot every season")],
    evidence: o("Rekodi za malipo za kaya na alama za ardhi", "Household payout records and land scores"), tool: "money" },
  { id: "orgs", who: o("Mashirika na sera", "Organisations and policy"),
    need: [o("Ushahidi kutoka kwa kaya, si hadithi tu", "Evidence from households, not anecdotes"), o("Mapengo kati ya kanuni na kinachotokea", "Gaps between the regulations and practice"), o("Ni nani anaachwa nje", "Who is being left out")],
    act: [o("Kusaidia jamii kuomba ripoti za mwaka", "Help communities request annual reports"), o("Kuwasilisha muhtasari kwa kaunti na bunge", "Bring summaries to county and national policy makers"), o("Kufadhili akiba na ufuatiliaji wa jamii", "Fund reserves and community monitoring")],
    evidence: o("Muhtasari wa mapengo kutoka dashibodi ya msimamizi", "Gap summaries from the admin dashboard"), tool: "economics" },
  { id: "schools", who: o("Wanafunzi na walimu shuleni", "Learners and teachers in schools"),
    need: [o("Masomo yanayohusiana na mtaala wa CBE", "Lessons that link to the CBE curriculum"), o("Shughuli za vitendo, si nadharia tu", "Hands-on activities, not only theory"), o("Michezo kwa watoto wadogo", "Games for younger children")],
    act: [o("Shamba darasa la urejeshaji shuleni", "A school regeneration plot as a living lab"), o("Wanafunzi wanapima na kuripoti kwa jamii", "Learners measure and report back to the community"), o("Michezo ya matofali sita darasani", "Six Bricks games in class")],
    evidence: o("Rekodi za shamba la shule na alama za michezo", "School plot records and game scores"), tool: "regen" },
  { id: "learners", who: o("Wanafunzi wazima na wakufunzi", "Adult learners and trainers"),
    need: [o("Safari fupi za kujifunza kwenye simu", "Short learning journeys on the phone"), o("Njia ya kuwafundisha wengine", "A way to teach others"), o("Kujua lini kuamini AI", "Knowing when to trust AI")],
    act: [o("Kumaliza safari na kazi za nyumbani", "Finish the journey and home tasks"), o("Kuongoza kundi la kujifunza", "Lead a learning circle"), o("Kutumia michezo katika mikutano", "Use games in meetings")],
    evidence: o("Umahiri wa masomo na maendeleo ya makundi", "Lesson mastery and circle progress"), tool: "change" },
];
// Kenya CBE Junior School learning areas that this content fits (teachers choose the strand).
export const CBE_LINKS: { area: T; fit: T }[] = [
  { area: o("Kilimo na Lishe", "Agriculture and Nutrition"), fit: o("Malisho kwa zamu, mashimo ya zai, benki ya lishe", "Rotational grazing, zai pits, fodder banks") },
  { area: o("Sayansi Jumuishi", "Integrated Science"), fit: o("Kaboni kwenye udongo, kupima maji kuingia ardhini", "Soil carbon, measuring water infiltration") },
  { area: o("Masomo ya Jamii", "Social Studies"), fit: o("Ardhi ya jamii, ridhaa huru, uongozi wa kamati", "Community land, free consent, committee leadership") },
  { area: o("Hisabati", "Mathematics"), fit: o("Asilimia za mgao, njia ya pesa, wastani wa malipo", "Share percentages, the money trail, average payouts") },
];

/* ---------------- 5. Regeneration monitoring ---------------- */

export type Check = { id: string; date: string; season: string; grass: number; bare: number; trees: number; worms: number; soakSec: number; photo: boolean; note: string };
export const METHODS: { id: keyof Check; name: T; how: T }[] = [
  { id: "grass", name: o("Nyasi (% ya ardhi)", "Grass cover (% of ground)"), how: o("Simama mahali pale pale kila msimu. Tupa kijiti mara 20; hesabu mara kinapoangukia nyasi, zidisha kwa 5.", "Stand at the same spot each season. Toss a stick 20 times; count how often it lands on grass, multiply by 5.") },
  { id: "bare", name: o("Ardhi tupu (%)", "Bare ground (%)"), how: o("Kwa urushaji ule ule 20: mara ngapi kimeangukia udongo mtupu, zidisha kwa 5.", "From the same 20 tosses: how often it lands on bare soil, multiply by 5.") },
  { id: "trees", name: o("Miti hai kwenye kipande", "Living trees on the plot"), how: o("Hesabu miti na miche iliyo hai ndani ya kipande chako.", "Count living trees and seedlings inside your plot.") },
  { id: "worms", name: o("Minyoo kwenye jembe moja", "Earthworms in one spade"), how: o("Chimba jembe moja la udongo baada ya mvua, hesabu minyoo. Minyoo zaidi = udongo hai zaidi.", "Dig one spade of soil after rain and count worms. More worms = more living soil.") },
  { id: "soakSec", name: o("Sekunde za maji kuingia", "Seconds for water to soak in"), how: o("Mimina kikombe kimoja cha maji ndani ya mkebe uliozamishwa. Pima sekunde hadi yaishe. Haraka zaidi ni bora.", "Pour one cup of water into a can pushed into the soil. Time until it is gone. Faster is better.") },
  { id: "photo", name: o("Picha ya kumbukumbu", "Photo point"), how: o("Piga picha kutoka sehemu ile ile, ukielekea upande ule ule, kila msimu.", "Take a photo from the same spot, facing the same way, every season.") },
];
export const SEASONS: T[] = [o("Masika (Machi-Mei)", "Long rains (Mar-May)"), o("Kiangazi (Jun-Sep)", "Dry season (Jun-Sep)"), o("Vuli (Okt-Des)", "Short rains (Oct-Dec)"), o("Kiangazi kifupi (Jan-Feb)", "Short dry (Jan-Feb)")];

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));
// 0-100. A simple, explainable score for households and schools; it does NOT count tonnes of carbon.
export function regenScore(c: Pick<Check, "grass" | "bare" | "trees" | "worms" | "soakSec">) {
  const soak = c.soakSec > 0 ? clamp(100 - (c.soakSec - 30) / 2.7) : 0; // 30s or less = 100, 300s = 0
  return r(clamp(c.grass) * 0.35 + (100 - clamp(c.bare)) * 0.25 + clamp(c.trees * 5) * 0.15 + clamp(c.worms * 10) * 0.15 + soak * 0.1);
}
export function regenTrend(checks: Check[]): { score: number; change: number | null; alerts: T[] } {
  if (!checks.length) return { score: 0, change: null, alerts: [] };
  const sorted = [...checks].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1], prev = sorted[sorted.length - 2];
  const score = regenScore(last);
  const alerts: T[] = [];
  if (prev && last.bare > prev.bare + 10) alerts.push(o("Ardhi tupu imeongezeka kwa zaidi ya 10. Pumzisha kipande hiki msimu ujao.", "Bare ground rose by more than 10. Rest this plot next season."));
  if (prev && last.trees < prev.trees) alerts.push(o("Miti imepungua. Angalia mifugo, moto au ukataji.", "Trees went down. Check for browsing, fire or cutting."));
  if (last.grass < 30) alerts.push(o("Nyasi chini ya 30%. Hii ni hatari kwa mifugo na kwa malipo ya kaboni.", "Grass under 30%. This is a risk for the herd and for carbon payouts."));
  return { score, change: prev ? score - regenScore(prev) : null, alerts };
}

/* ---------------- 6. Clever farming for regeneration ---------------- */

export type Practice = { id: string; name: T; what: T; when: number[]; cost: 1 | 2 | 3; months: number; land: T; income: T; check: T };
export const PRACTICES: Practice[] = [
  { id: "rotate", name: o("Malisho kwa zamu", "Planned rotational grazing"), what: o("Gawanya malisho vipande; mifugo inakaa muda mfupi kisha nyasi zinapumzika.", "Split grazing into blocks; animals stay a short time, then the grass rests."), when: [0, 1, 2, 3], cost: 1, months: 6, land: o("Nyasi zinarudi, mizizi inaingia ndani zaidi", "Grass recovers, roots go deeper"), income: o("Lishe zaidi kiangazi", "More feed in the dry season"), check: o("Linganisha na mpango wa malisho wa mradi", "Match it with the project's grazing plan") },
  { id: "reseed", name: o("Kupanda tena nyasi za asili", "Reseeding native grass"), what: o("Panda mbegu za nyasi za kienyeji kwenye ardhi tupu kabla ya mvua.", "Sow local grass seed on bare patches before the rains."), when: [0, 2], cost: 2, months: 4, land: o("Ardhi tupu inafunikwa", "Bare ground is covered"), income: o("Mbegu na nyasi kavu za kuuza", "Seed and hay to sell"), check: o("Tumia mbegu za asili, si za kigeni", "Use native seed, not invasive species") },
  { id: "fodder", name: o("Benki ya lishe na nyasi kavu", "Fodder bank and hay"), what: o("Kata na hifadhi nyasi wakati wa mvua kwa ajili ya kiangazi.", "Cut and store grass in the rains for the dry season."), when: [0, 2], cost: 2, months: 3, land: o("Mifugo haimalizi malisho kiangazi", "Animals do not strip the range in the dry season"), income: o("Mifugo michache inakufa; nyasi za kuuza", "Fewer animal deaths; hay to sell"), check: o("Panga nafasi ya kuhifadhi kabla", "Plan storage space first") },
  { id: "zai", name: o("Mashimo ya zai na nusu mwezi", "Zai pits and half-moons"), what: o("Chimba mashimo au matuta ya nusu mwezi kushika maji ya mvua na samadi.", "Dig pits or half-moon bunds that catch rain water and manure."), when: [1, 3], cost: 1, months: 4, land: o("Maji yanaingia, udongo unarudi", "Water soaks in, soil comes back"), income: o("Mavuno bora hata mvua kidogo", "Better harvests even with little rain"), check: o("Chimba kiangazi, kabla ya mvua", "Dig in the dry season, before rains") },
  { id: "trees", name: o("Miti ya lishe na matunda", "Fodder and fruit trees"), what: o("Panda miti inayotoa lishe, matunda au kivuli kwenye mipaka.", "Plant trees that give fodder, fruit or shade along boundaries."), when: [0, 2], cost: 2, months: 24, land: o("Kivuli, udongo unashikwa, kaboni zaidi", "Shade, soil held, more carbon"), income: o("Matunda, lishe, kuni zilizopangwa", "Fruit, fodder, planned firewood"), check: o("Uliza kama mkataba unahesabu miti hii", "Ask whether the agreement counts these trees") },
  { id: "manure", name: o("Mbolea ya samadi", "Composting manure"), what: o("Kusanya samadi ya boma, iozeshe, irudishe shambani.", "Collect boma manure, compost it, return it to the soil."), when: [1, 3], cost: 1, months: 3, land: o("Udongo hai, minyoo zaidi", "Living soil, more worms"), income: o("Mbolea ya bure badala ya kununua", "Free fertiliser instead of buying") , check: o("Funika ili isipoteze nguvu juani", "Cover it so it keeps its strength in the sun") },
  { id: "water", name: o("Kuvuna maji", "Water harvesting"), what: o("Mifereji ya paa, mabwawa madogo na matuta kwenye mteremko.", "Roof gutters, small pans and contour bunds on slopes."), when: [1, 3], cost: 3, months: 2, land: o("Mmomonyoko unapungua", "Less erosion"), income: o("Muda mdogo wa kutafuta maji", "Less time fetching water"), check: o("Shirikisha jamii kwa mabwawa ya pamoja", "Involve the community for shared pans") },
  { id: "bees", name: o("Ufugaji wa nyuki", "Beekeeping"), what: o("Mizinga ya nyuki kwenye miti iliyopo badala ya kuikata.", "Hives in existing trees instead of cutting them."), when: [1, 3], cost: 2, months: 8, land: o("Miti inalindwa, uchavushaji", "Trees protected, pollination"), income: o("Asali na nta ya kuuza", "Honey and wax to sell"), check: o("Weka mbali na njia za mifugo", "Keep away from livestock paths") },
];

/* ---------------- The expert team: gaps and where the platform answers them ---------------- */

export type Gap = { role: T; gap: T; answer: T; tab: string; open: T };
export const GAPS: Gap[] = [
  { role: o("Mtaalamu wa fedha za kaboni", "Carbon finance specialist"), gap: o("Jamii haioni bei, gharama wala kiasi kilichouzwa.", "Communities never see the price, the costs or the volume sold."), answer: o("Njia ya pesa inaonyesha kila shilingi kutoka mauzo hadi kaya.", "The money trail shows every shilling from sale to household."), tab: "money", open: o("Bei halisi zinahitaji ripoti za mwekezaji", "Real prices need the developer's reports") },
  { role: o("Mhasibu wa jamii", "Community accountant"), gap: o("Hakuna anayeweza kuthibitisha 'gharama za kufanya biashara'.", "Nobody can check the 'cost of doing business'."), answer: o("Kila mstari una mwenye kuushika na ushahidi wa kuomba.", "Every line names who holds it and the proof to ask for."), tab: "money", open: o("Ukaguzi huru bado unahitajika", "An independent audit is still needed") },
  { role: o("Mchumi wa maendeleo", "Development economist"), gap: o("Malipo yanabadilika sana; gharama za kubadilika hazihesabiwi.", "Payouts swing a lot; the cost of changing is not counted."), answer: o("Akiba ya utulivu na hesabu ya faida na gharama kwa miaka 10.", "A stability reserve and a 10-year gain-and-cost model."), tab: "economics", open: o("Data halisi ya mapato ya kaya", "Real household income data") },
  { role: o("Mtaalamu wa ufuatiliaji (M&E)", "M&E / theory of change specialist"), gap: o("Matokeo yanapimwa kwa jamii, si kwa kaya.", "Results are measured for the community, not the household."), answer: o("Nadharia ya mabadiliko ya kaya yenye viashiria na dhana.", "A household theory of change with indicators and assumptions."), tab: "change", open: o("Utafiti wa msingi wa kaya", "A household baseline survey") },
  { role: o("Mtaalamu wa jinsia na ujumuishaji", "Gender and inclusion specialist"), gap: o("Malipo yanafika kwa mwanaume mmoja; wanawake na vijana wanaachwa.", "Payouts reach one man; women and youth are left out."), answer: o("Swali la nani anaamua liko ndani ya nadharia ya mabadiliko na mgawanyo wa kaya.", "Who decides is built into the theory of change and household split."), tab: "change", open: o("Malipo kwa majina mawili yanahitaji sera ya CDA", "Joint-name payments need a CDA policy") },
  { role: o("Mtaalamu wa elimu", "Education specialist"), gap: o("Maarifa yanabaki kwa viongozi wachache.", "Knowledge stays with a few leaders."), answer: o("Njia nne za maarifa: jamii, mashirika, shule na wakufunzi, pamoja na viungo vya CBE.", "Four knowledge pathways: community, organisations, schools and trainers, with CBE links."), tab: "pathways", open: o("Mapitio ya walimu na KICD", "Review by teachers and KICD") },
  { role: o("Mchambuzi wa sera na sheria", "Policy and legal analyst"), gap: o("Kanuni zipo lakini ushahidi wa utekelezaji haupo.", "The regulations exist but there is no evidence on implementation."), answer: o("Rekodi za kaya na mapengo yanaweza kuwa muhtasari wa sera.", "Household records and gap data become policy summaries."), tab: "pathways", open: o("Ushauri wa wakili wa Kenya", "Advice from Kenyan counsel") },
  { role: o("Mtaalamu wa ikolojia ya malisho", "Rangeland ecologist"), gap: o("Urejeshaji unapimwa na wageni mara moja kwa miaka.", "Regeneration is measured by outsiders once every few years."), answer: o("Kipimo cha ardhi cha kaya kila msimu, kwa zana rahisi.", "A household land monitor every season, with simple tools."), tab: "regen", open: o("Hakihesabu tani za kaboni; MRV rasmi bado inahitajika", "It does not count carbon tonnes; formal MRV is still needed") },
  { role: o("Mtaalamu wa kilimo", "Agronomist"), gap: o("Mikataba inazuia malisho bila kutoa njia mbadala.", "Agreements restrict grazing without offering alternatives."), answer: o("Mazoea manane ya kilimo bora yenye kalenda ya misimu.", "Eight clever farming practices with a season calendar."), tab: "farming", open: o("Majaribio ya shambani na maafisa wa kilimo", "Field trials with extension officers") },
  { role: o("Mlinzi wa maarifa ya jadi", "Indigenous knowledge keeper"), gap: o("Maarifa ya wazee yanachukuliwa bila ridhaa.", "Elders' knowledge is taken without consent."), answer: o("Mazoea yanaanzia na maarifa ya jamii; ridhaa kabla ya kurekodi.", "Practices start from community knowledge; consent before recording."), tab: "farming", open: o("Mapitio na wazungumzaji wa Maa", "Review by Maa speakers") },
];

export const TABS = ["overview", "money", "change", "economics", "pathways", "regen", "farming"] as const;
export type Tab = (typeof TABS)[number];
export const TAB_NAMES: Record<Tab, T> = {
  overview: o("Picha kamili", "The whole picture"),
  money: o("Njia ya pesa", "Money trail"),
  change: o("Mabadiliko ya kaya", "Household change"),
  economics: o("Uchumi wa mabadiliko", "Economics of change"),
  pathways: o("Njia za maarifa", "Knowledge pathways"),
  regen: o("Kipimo cha ardhi", "Land monitor"),
  farming: o("Kilimo bora", "Clever farming"),
};
