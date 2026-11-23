import { describe, expect, it } from "vitest";
import { FOLLOW, STARTERS, converse, findCard } from "../shared/council";
import { PILLAR_CARDS } from "../shared/pillar-cards";
import { TABS } from "../shared/impact";

const ask = (text: string, lang: "sw" | "en" = "en") => converse(text, { lang, audience: "herder", intake_step: 99 }, { pending: null, n: 4, listen: false });

describe("chat knows the six pillars", () => {
  const cases: [string, string][] = [
    ["Where does the money go from the buyer to the household?", "trail"],
    ["Pesa zinakwenda wapi kutoka kwa mnunuzi hadi kaya?", "trail"],
    ["How do we account for every shilling?", "trail"],
    ["How can payouts stay reliable in a drought year?", "reliable"],
    ["Malipo yanawezaje kutegemewa mwaka wa ukame?", "reliable"],
    ["What is the theory of change for a household?", "household"],
    ["Kaya inawezaje kutumia malipo vizuri?", "household"],
    ["Is it worth changing how we graze?", "economics"],
    ["Je, inafaa kubadilisha jinsi tunavyochunga?", "economics"],
    ["How does this knowledge reach schools and organisations?", "pathways"],
    ["How do we monitor land regeneration?", "regen"],
    ["Tunapimaje urejeshaji wa ardhi?", "regen"],
    ["What is clever farming for regeneration?", "farming"],
    ["Kilimo bora cha kurejesha ardhi ni kipi?", "farming"],
  ];
  for (const [q, id] of cases) it(q, () => expect(findCard(q)?.id).toBe(id));

  it("old topics still win their own questions", () => {
    for (const [q, id] of [["Who buys carbon credits?", "buyers"], ["What happens in a drought?", "grazing"],["What share of earnings do we get?", "share"]]) expect(findCard(q)?.id, q).toBe(id);
  });

  it("every pillar follow-up reaches a card, in both languages", () => {
    for (const c of PILLAR_CARDS) for (const f of c.follow ?? []) for (const l of ["sw", "en"] as const) expect(findCard(f[l]), f[l]).not.toBeNull();
    for (const f of [...Object.values(FOLLOW).flat(), ...STARTERS]) expect(findCard(f.en), f.en).not.toBeNull();
  });

  it("a pillar reply names its tool, its own points and its own follow-ups", () => {
    for (const c of PILLAR_CARDS) {
      expect(TABS).toContain(c.tool);
      const t = ask(c.words[0]);
      expect(t.replies[0].body, c.id).toContain("open Impact");
      expect(t.followups.length).toBeGreaterThan(0);
    }
    const sw = ask("njia ya pesa", "sw");
    expect(sw.replies[0].body).toContain("fungua Athari");
    expect(sw.followups).toContain("Malipo yanawezaje kutegemewa mwaka wa ukame?");
  });
});
