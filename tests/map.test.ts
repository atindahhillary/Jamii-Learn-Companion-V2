import { describe, expect, it } from "vitest";
import { COUNTY_SHAPES, MAP_H, MAP_W } from "../shared/kenya-counties";
import { ARID, RESTORATION, SEMI_ARID, SINKS, asalOf, sinksIn, sitesIn } from "../shared/kenya-map";
import { COUNTIES } from "../shared/mel";

describe("Kenya map", () => {
  it("has a shape for each of the 47 counties, inside the drawing box", () => {
    expect(Object.keys(COUNTY_SHAPES).sort()).toEqual([...COUNTIES].sort());
    for (const [c, s] of Object.entries(COUNTY_SHAPES)) {
      expect(s.d.startsWith("M"), c).toBe(true);
      expect(s.cx).toBeGreaterThan(0); expect(s.cx).toBeLessThan(MAP_W);
      expect(s.cy).toBeGreaterThan(0); expect(s.cy).toBeLessThan(MAP_H);
    }
  });
  it("uses the official 23 ASAL counties, 9 arid and 14 semi-arid, with no overlap", () => {
    expect(ARID).toHaveLength(9); expect(SEMI_ARID).toHaveLength(14);
    expect(ARID.filter((c) => SEMI_ARID.includes(c))).toEqual([]);
    for (const c of [...ARID, ...SEMI_ARID]) expect(COUNTIES, c).toContain(c);
    expect(asalOf("Turkana")).toBe("arid"); expect(asalOf("Narok")).toBe("semi"); expect(asalOf("Nairobi")).toBeNull();
  });
  it("every restoration site and carbon sink names real counties and has a source", () => {
    for (const x of [...RESTORATION, ...SINKS]) {
      for (const c of x.counties) expect(COUNTIES, `${x.id}: ${c}`).toContain(c);
      expect(x.source).toMatch(/^https:\/\//);
    }
    for (const r of RESTORATION) for (const c of r.counties) expect(asalOf(c), `${r.id} is in an ASAL county`).not.toBeNull();
    expect(sitesIn("Baringo").length).toBeGreaterThanOrEqual(2);
    expect(sinksIn("Kwale").map((s) => s.id)).toEqual(expect.arrayContaining(["mikoko", "vanga", "kaya"]));
  });
});
