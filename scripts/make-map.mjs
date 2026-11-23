// Converts geoBoundaries KEN ADM1 GeoJSON into small SVG paths for the app.
// Usage: node scripts/make-map.mjs <geoBoundaries-KEN-ADM1_simplified.geojson> shared/kenya-counties.ts
import fs from "node:fs";

const [input, output] = process.argv.slice(2);
const geo = JSON.parse(fs.readFileSync(input, "utf8"));
const COUNTIES = ["Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"];
const fix = { Tharaka: "Tharaka-Nithi", "Taita Taveta": "Taita-Taveta", "Elgeyo Marakwet": "Elgeyo-Marakwet", "Murang’a": "Murang'a", "Nairobi City": "Nairobi", "Trans-Nzoia": "Trans Nzoia", "Homabay": "Homa Bay" };

// Bounding box, then an equirectangular projection scaled for latitude (Kenya sits on the equator, so this is close to true shape).
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const rings = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
for (const f of geo.features) for (const poly of rings(f.geometry)) for (const [x, y] of poly[0]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
const W = 1000, k = W / (maxX - minX), H = Math.round((maxY - minY) * k);
const P = ([x, y]) => [(x - minX) * k, (maxY - y) * k];

// Douglas-Peucker simplification in projected units.
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let best = 0, at = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len; if (d > best) { best = d; at = i; } }
    if (best > tol && at > 0) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (r) => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
const centroid = (r) => { const A = area(r) || 1; let cx = 0, cy = 0; r.forEach((p, i) => { const q = r[(i + 1) % r.length], c = p[0] * q[1] - q[0] * p[1]; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; }); return [cx / (6 * A), cy / (6 * A)]; };

const out = {};
for (const f of geo.features) {
  const raw = f.properties.shapeName.trim(), name = fix[raw] ?? raw;
  if (!COUNTIES.includes(name)) throw new Error(`unknown county name: ${raw}`);
  const parts = rings(f.geometry).map((poly) => { const full = poly[0].map(P); const s = simplify(full, 1.5); const ring = s.length >= 4 ? s : full; return { ring, a: Math.abs(area(ring)) }; });
  const big = parts.reduce((m, p) => (p.a > m.a ? p : m)).ring;
  // Drop specks (tiny islands) that would not be visible, but always keep the county's main shape.
  const d = parts.filter((p) => p.ring === big || p.a >= 4).map(({ ring }) => "M" + ring.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join("L") + "Z").join("");
  const [cx, cy] = centroid(big);
  out[name] = { d, cx: +cx.toFixed(1), cy: +cy.toFixed(1) };
}
const missing = COUNTIES.filter((c) => !out[c]);
if (missing.length) throw new Error(`missing counties: ${missing.join(", ")}`);

fs.writeFileSync(output, `// Kenya's 47 county outlines for the impact map, projected to a ${W}x${H} SVG box.
// Source: geoBoundaries gbOpen KEN ADM1 (public domain; data RCMRD 2020), simplified. Generated, do not edit by hand.
export const MAP_W = ${W}, MAP_H = ${H};
export const COUNTY_SHAPES: Record<string, { d: string; cx: number; cy: number }> = ${JSON.stringify(out)};
`);
console.log("counties", Object.keys(out).length, "bytes", fs.statSync(output).size, "box", W, H);
