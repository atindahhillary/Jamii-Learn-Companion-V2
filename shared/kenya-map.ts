// Facts behind the impact map: ASAL counties, documented restoration in ASALs, and Kenya's main carbon sinks.
// Checked against the sources listed (November 2026). County lists for the five water towers are approximate.
import { o, type T } from "./content.js";

// Official list (Vision 2030 strategy for Northern Kenya and other arid lands, 2012; still used by NDMA in 2026).
export const ARID = ["Garissa", "Mandera", "Wajir", "Marsabit", "Isiolo", "Turkana", "Samburu", "Baringo", "Tana River"];
export const SEMI_ARID = ["Kitui", "Makueni", "Meru", "Tharaka-Nithi", "Embu", "Nyeri", "West Pokot", "Narok", "Kajiado", "Laikipia", "Kilifi", "Kwale", "Lamu", "Taita-Taveta"];
export const ASAL_NOTE = o(
  "Orodha rasmi ina kaunti 23 za ASAL (kame 9, nusu kame 14). Vyanzo vingine vya UN vinasema 29, lakini havitaji kaunti sita za ziada. Sehemu tu za Meru na Nyeri ni nusu kame.",
  "The official list has 23 ASAL counties (9 arid, 14 semi-arid). Some UN sources say 29 but do not name the extra six. Only parts of Meru and Nyeri are semi-arid.",
);
export const ASAL_SOURCES: [string, string][] = [
  ["Vision 2030 strategy for Northern Kenya and other arid lands (2012), Table 1", "https://faolex.fao.org/docs/pdf/ken179242.pdf"],
  ["NDMA National Drought Early Warning Bulletin, July 2026", "https://knowledgeweb.ndma.go.ke/Content/LibraryDocuments/National_Drought_Early_Warning_Bulletin_July_202620260819151459.pdf"],
];
export const asalOf = (county: string): "arid" | "semi" | null => (ARID.includes(county) ? "arid" : SEMI_ARID.includes(county) ? "semi" : null);

export type Site = { id: string; counties: string[]; what: T; who: string; source: string };
export const RESTORATION: Site[] = [
  { id: "baringo-reseed", counties: ["Baringo"], who: "RAE Trust (since 1982)", source: "https://link.springer.com/10.1186/s13570-022-00238-4",
    what: o("Wafugaji hupanda tena nyasi za asili kwenye mashamba yaliyozungushiwa uzio karibu na Ziwa Baringo; utafiti wa 2022 unahusisha mashamba haya na mifugo kuishi ukame.", "Herders reseed native grasses in enclosed fields near Lake Baringo; a 2022 study links the fields to herds surviving drought.") },
  { id: "prosopis-kefri", counties: ["Baringo"], who: "KEFRI national Prosopis plan (2023)", source: "https://standardmedia.co.ke/business/amp/environment-climate/article/2001500996/kefri-needs-sh22-billion-to-eradicate-mathenge-tree",
    what: o("Kuondoa mti vamizi wa Mathenge (Prosopis) huko Tiaty na Baringo Kusini; mpango bado unakosa fedha.", "Clearing invasive Mathenge (Prosopis) in Tiaty and Baringo South; the plan is still short of funds.") },
  { id: "prosopis-ilo", counties: ["Turkana", "Garissa", "Tana River"], who: "ILO PROSPECTS, KEFRI and county governments", source: "https://www.ilo.org/resource/article/turning-prosopis-green-jobs-kenya",
    what: o("Jamii hulipwa kuondoa Prosopis na kupanda nyasi na miti ya asili; mbao hugeuzwa mkaa wa briketi na lishe ya mifugo.", "Communities are paid to clear Prosopis and reseed pasture and native trees; the wood becomes briquettes and animal feed.") },
  { id: "turkana-reseed", counties: ["Turkana"], who: "Wetlands International; World Vision (KDREAM)", source: "https://africa.wetlands.org/en/video/a-new-dawn-quest-to-restore-turkanas-rangelands",
    what: o("Karibu hekta 600 za malisho zilipandwa tena nyasi huko Parar na Kapua; kikundi cha wanawake hupanda malisho kwa umwagiliaji Turkana Magharibi.", "About 600 ha of rangeland reseeded at Parar and Kapua; a women's group grows irrigated pasture in Turkana West.") },
  { id: "amboseli-bunds", counties: ["Kajiado"], who: "Justdiggit, Big Life, SORALO, WWF-Kenya", source: "https://justdiggit.org/project/kenya-amboseli",
    what: o("Matuta ya nusu mwezi kushika maji ya mvua na mbegu za nyasi za asili kutoka benki za mbegu za vikundi vya wanawake (takwimu kutoka Justdiggit).", "Half-moon earth bunds that catch rain, and native grass seed from women's group seed banks (figures from Justdiggit).") },
  { id: "narok-iucn", counties: ["Narok", "Kajiado"], who: "IUCN with NEMA (GEF-funded)", source: "https://iucn.org/node/48138",
    what: o("Benki za nyasi za jamii, kupanda tena nyasi za asili, mabwawa madogo ya maji na usimamizi wa malisho.", "Community grass banks, native reseeding, micro-catchments and grazing management.") },
  { id: "nrt-grazing", counties: ["Isiolo", "Samburu", "Marsabit", "Laikipia"], who: "Northern Rangelands Trust conservancies", source: "https://casestudies.naturebasedsolutionsinitiative.org/casestudy/rangeland-management-for-carbon-sequestration/",
    what: o("Malisho yaliyopangwa kwa zamu, kupanda tena nyasi, kurekebisha makorongo na kudhibiti vichaka vamizi (takwimu za eneo ni za NRT; mradi wa kaboni una mabishano).", "Planned rotational grazing, reseeding, gully healing and invasive bush control (area figures are NRT's own; the carbon project is disputed).") },
  { id: "regreening", counties: ["Baringo", "Laikipia", "Samburu", "Isiolo", "Marsabit"], who: "Regreening Africa (EU-funded)", source: "https://www.unccd.int/resources/unccd-library/restoring-degraded-land-kenya-regreening-africa",
    what: o("Kuotesha upya miti iliyokatwa kwa usimamizi wa wakulima (FMNR) na kilimo mseto; karibu hekta 20,000 kufikia 2020.", "Farmer-managed natural regeneration (FMNR) and agroforestry; about 20,000 ha by end of 2020.") },
  { id: "pokot-fmnr", counties: ["West Pokot"], who: "World Vision CRIFSUP (DFAT)", source: "https://www.wvi.org/sites/default/files/2026-06/CRIFSUP%20FMNR%20Photobook%202026%2011.pdf",
    what: o("Wakulima viongozi 1,110 huko Chepareria walifundishwa FMNR.", "1,110 lead farmers in Chepareria trained in FMNR.") },
  { id: "makueni-dams", counties: ["Makueni"], who: "Self-help groups, Excellent Development, Africa Sand Dam Foundation", source: "https://casestudies.naturebasedsolutionsinitiative.org/casestudy/transforming-lives-and-land-with-sand-dams-and-climate-smart-agriculture-in-kenya/",
    what: o("Vikundi 111 vimejenga mabwawa ya mchanga 366 ya kuvuna maji; utafiti ulipata mimea zaidi karibu na mabwawa wakati wa ukame.", "111 self-help groups built 366 sand dams to harvest water; a study found more vegetation near the dams in drought.") },
  { id: "kitui-dams", counties: ["Kitui"], who: "Community sand dams", source: "https://link.springer.com/article/10.1007/s40899-020-00417-4",
    what: o("Mabwawa ya mchanga 500 hadi 750. Tahadhari: karibu nusu ya mabwawa 116 yaliyochunguzwa hayakuwa na maji, hivyo mahali bwawa linajengwa ni muhimu.", "About 500 to 750 sand dams. Caution: about half of 116 dams surveyed held no water, so siting matters.") },
];

export type SinkType = "tower" | "forest" | "mangrove" | "rangeland" | "project";
export type Sink = { id: string; name: string; type: SinkType; counties: string[]; fact: T; source: string; approx?: boolean };
export const SINK_TYPES: Record<SinkType, T> = {
  tower: o("Mnara wa maji (msitu)", "Water tower (forest)"), forest: o("Msitu", "Forest"), mangrove: o("Mikoko", "Mangroves"),
  rangeland: o("Kaboni ya udongo wa malisho", "Rangeland soil carbon"), project: o("Mradi wa kaboni uliosajiliwa", "Registered carbon project"),
};
const AUDIT = "https://wgea.org/wp-content/uploads/formidable/2/conservation_of_water_towers_in_kenya_audit_summary.pdf";
export const SINKS: Sink[] = [
  { id: "mau", name: "Mau Forest Complex", type: "tower", counties: ["Narok", "Nakuru", "Bomet", "Kericho"], approx: true, source: AUDIT, fact: o("Mnara mkubwa zaidi kati ya minara mitano mikuu ya maji; minara hii hutoa karibu 75% ya maji ya Kenya.", "The largest of the five major water towers, which together supply about 75% of Kenya's water.") },
  { id: "mtkenya", name: "Mt Kenya", type: "tower", counties: ["Meru", "Embu", "Kirinyaga", "Nyeri", "Tharaka-Nithi", "Laikipia"], approx: true, source: AUDIT, fact: o("Mmoja wa minara mitano mikuu ya maji.", "One of the five major water towers.") },
  { id: "aberdare", name: "Aberdare Ranges", type: "tower", counties: ["Nyandarua", "Nyeri", "Murang'a", "Kiambu"], approx: true, source: AUDIT, fact: o("Mmoja wa minara mitano mikuu ya maji.", "One of the five major water towers.") },
  { id: "elgon", name: "Mt Elgon", type: "tower", counties: ["Bungoma", "Trans Nzoia"], approx: true, source: AUDIT, fact: o("Mnara mkuu wa maji kwenye mpaka na Uganda.", "A major water tower on the Uganda border.") },
  { id: "cherangani", name: "Cherangani Hills", type: "tower", counties: ["West Pokot", "Elgeyo-Marakwet", "Trans Nzoia"], approx: true, source: AUDIT, fact: o("Mmoja wa minara mitano mikuu ya maji.", "One of the five major water towers.") },
  { id: "kakamega", name: "Kakamega Forest", type: "forest", counties: ["Kakamega"], source: "https://www.keybiodiversityareas.org/site/factsheet/6448", fact: o("Msitu wa mvua wa mwinuko wa kati, sehemu ya mashariki zaidi ya misitu ya bonde la Kongo.", "A mid-altitude rainforest, the easternmost outlier of the Congo Basin forests.") },
  { id: "arabuko", name: "Arabuko-Sokoke", type: "forest", counties: ["Kilifi"], source: "https://datazone.birdlife.org/site/factsheet/arabuko-sokoke-forest-iba-kenya", fact: o("Kipande kikubwa zaidi kilichobaki cha msitu wa pwani ya Afrika Mashariki.", "The largest surviving fragment of East African coastal forest.") },
  { id: "kaya", name: "Mijikenda Kaya Forests", type: "forest", counties: ["Kilifi", "Kwale", "Mombasa"], source: "https://whc.unesco.org/en/list/1231", fact: o("Misitu mitakatifu inayolindwa na Wazee wa Kaya; Urithi wa Dunia wa UNESCO tangu 2008.", "Sacred forests protected by Kaya Elders; UNESCO World Heritage since 2008.") },
  { id: "lamu-mangroves", name: "Lamu mangroves", type: "mangrove", counties: ["Lamu"], source: "https://www.frontiersin.org/articles/10.3389/ffgc.2021.709227/full", fact: o("Kenya ina karibu hekta 61,000 za mikoko, na karibu 60% ziko Lamu. Mikoko huhifadhi kaboni nyingi kwenye udongo.", "Kenya has about 61,000 ha of mangroves and about 60% are in Lamu. Mangroves store much carbon in their soils.") },
  { id: "mikoko", name: "Mikoko Pamoja (Gazi Bay)", type: "project", counties: ["Kwale"], source: "https://thecommonwealth.org/case-study/case-study-community-led-mangrove-restoration-and-conservation-gazi-bay-kenya-lessons", fact: o("Mradi wa jamii wa mikoko (Plan Vivo), karibu hekta 117, unauza mikopo tangu karibu 2013.", "A community mangrove project (Plan Vivo), about 117 ha, selling credits since about 2013.") },
  { id: "vanga", name: "Vanga Blue Forest", type: "project", counties: ["Kwale"], source: "https://sustainabletravel.org/wp-content/uploads/Vanga-Blue-Forest-PDD_27dec19_PlanVivo.pdf", fact: o("Unafuata mfano wa Mikoko Pamoja (Plan Vivo, 2019). Hali ya sasa haijathibitishwa.", "Follows the Mikoko Pamoja model (Plan Vivo, 2019). Current status not verified.") },
  { id: "kasigau", name: "Kasigau Corridor REDD+", type: "project", counties: ["Taita-Taveta"], source: "https://verra.org/verra-completes-review-of-kasigau-projects/", fact: o("Verra VCS 562 na 612, karibu hekta 200,000. Mwaka 2023 madai ya unyanyasaji yaliripotiwa; Verra ilisimamisha kisha ikaurudisha Februari 2024 kwa masharti. Angalia hali ya sasa.", "Verra VCS 562 and 612, about 200,000 ha. Abuse allegations were reported in 2023; Verra suspended it, then reinstated it in February 2024 with conditions. Check current status.") },
  { id: "chyulu", name: "Chyulu Hills REDD+", type: "project", counties: ["Makueni", "Kajiado", "Taita-Taveta"], source: "https://www.conservation.org/projects/chyulu-hills-carbon-project", fact: o("Verra VCS 1408, karibu hekta 410,000.", "Verra VCS 1408, about 410,000 ha.") },
  { id: "nkrcp", name: "Northern Kenya Rangelands Carbon Project", type: "rangeland", counties: ["Isiolo", "Samburu", "Marsabit", "Laikipia"], source: "https://verra.org/verra-reinstates-northern-kenya-grasslands-carbon-project-following-community-ratification-process/", fact: o("Verra VCS 1468 (NRT), kaboni ya udongo wa malisho. Ilisimamishwa 2023 na tena Mei 2025 baada ya uamuzi wa mahakama kuhusu hifadhi mbili za Isiolo; ilirudishwa karibu Juni 2026. Rufaa bado inaendelea na wakosoaji wanapinga.", "Verra VCS 1468 (NRT), rangeland soil carbon. Suspended in 2023 and again in May 2025 after a court ruling on two Isiolo conservancies; reinstated around June 2026. An appeal is pending and critics dispute it.") },
];

export const sitesIn = (county: string) => RESTORATION.filter((s) => s.counties.includes(county));
export const sinksIn = (county: string) => SINKS.filter((s) => s.counties.includes(county));
