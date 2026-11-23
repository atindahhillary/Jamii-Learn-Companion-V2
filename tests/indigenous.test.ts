import { describe, expect, it } from "vitest";
import { THEMES } from "../shared/content";
import { FOLLOW, converse, findCard } from "../shared/council";
import { MODULES } from "../shared/curriculum";
import { gameFromModule } from "../shared/games";
import { IK_CARDS, IK_MODULES } from "../shared/indigenous";
import { makePlan } from "../shared/plan";
import { STORY } from "../shared/story";

describe("Indigenous knowledge lessons", () => {
  it("are complete in both languages, with sources and a journey stop", () => {
    expect(THEMES.indigenous.en).toMatch(/Indigenous/);
    for (const m of IK_MODULES) {
      expect(MODULES).toContain(m);
      expect(STORY[m.id], m.id).toBeDefined();
      for (const t of [m.title, ...m.points, ...(m.examples ?? []), m.activity, m.carbon!, m.keepers!, ...m.quiz.flatMap((q) => [q.q, q.why, ...q.options])]) {
        expect(t.sw.trim(), m.id).not.toBe(""); expect(t.en.trim(), m.id).not.toBe("");
      }
      expect(m.sources!.length, m.id).toBeGreaterThanOrEqual(2);
      for (const [, url] of m.sources!) expect(url).toMatch(/^https:\/\//);
      for (const q of m.quiz) expect(q.answer).toBeLessThan(q.options.length);
    }
  });
  it("never uses the unverified term olokeri", () => {
    expect(JSON.stringify(IK_MODULES).toLowerCase()).not.toContain("olokeri");
  });
  it("can become games, and join a plan as four lessons", () => {
    for (const m of IK_MODULES) expect(gameFromModule(m.id, "quiz", "en")?.questions.length).toBeGreaterThanOrEqual(3);
    const plan = makePlan({ forWhom: "me", themes: ["indigenous"], level: "some", minutes: 30, note: "" });
    expect(plan.map((s) => s.moduleId)).toEqual(["m9", "m10", "m11", "m12"]);
  });
});

describe("the chat answers Indigenous knowledge questions", () => {
  const cases: [string, string][] = [
    ["How did communities rest pasture in the past?", "ik-grazing"], ["Jamii zilipumzishaje malisho zamani?", "ik-grazing"],
    ["How do sacred forests protect carbon?", "ik-sacred"], ["Misitu mitakatifu inalindaje kaboni?", "ik-sacred"],
    ["Who owns traditional knowledge?", "ik-rights"], ["Nani anamiliki maarifa ya jadi?", "ik-rights"],
    ["How do elders read the rain?", "ik-signs"], ["Wazee husoma mvua vipi?", "ik-signs"],
    ["What did the court say about the Ogiek?", "ik-rights"],
  ];
  for (const [q, id] of cases) it(q, () => expect(findCard(q)?.id).toBe(id));
  it("old answers still win their questions", () => {
    expect(findCard("What happens in a drought?")?.id).toBe("grazing");
    expect(findCard("Can we say no?")?.id).toBe("sayno");
  });
  it("every follow-up for this topic reaches a card, and the elder leads", () => {
    for (const f of [...FOLLOW.indigenous, ...IK_CARDS.flatMap((c) => c.follow ?? [])]) for (const l of ["sw", "en"] as const) expect(findCard(f[l]), f[l]).not.toBeNull();
    const t = converse("Who owns traditional knowledge?", { lang: "en", audience: "herder", intake_step: 99 }, { pending: null, n: 3, listen: false });
    expect(t.replies[0].body).toMatch(/2016/);
    expect(t.replies[0].source).toMatch(/Act No. 33/);
  });
});
