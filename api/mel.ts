// MEL team sync: POST {op:"team", name} creates a team and returns its secret code;
// POST {op:"sync", code, records, since} stores new records and returns everything the phone has not seen.
import pg from "pg";
import { createTeam, sync, type Db } from "../server/mel-sync.js";

const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 }) : null;
const db: Db | null = pool ? { query: (sql, params) => pool.query(sql, params as any[]) } : null;

// shortcut: per-instance memory limits reset on cold start; enough to stop casual abuse, move to the database if it grows.
const hits = new Map<string, number[]>();
function allowed(key: string, perHour: number) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t > 3600_000)) hits.delete(k);
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= perHour) return false;
  hits.set(key, [...recent, now]);
  return true;
}
const clientIp = (req: Request) => req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const sameSite = (req: Request) => {
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  try { return req.headers.get("x-ky") === "1" && (!origin || (host != null && new URL(origin).host === host)); } catch { return false; }
};

export function GET() { return json({ ready: !!db }); }

export async function POST(req: Request) {
  if (!db) return json({ error: "not_configured" }, 503);
  if (!sameSite(req)) return json({ error: "forbidden" }, 403);
  if (Number(req.headers.get("content-length") ?? 0) > 3_000_000) return json({ error: "too_large" }, 413);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return json({ error: "bad_request" }, 400);
  const ip = clientIp(req);
  try {
    if (b.op === "team") {
      if (!allowed(`team:${ip}`, 5)) return json({ error: "slow_down" }, 429);
      const r = await createTeam(db, b.name);
      return json(r.body, r.status);
    }
    if (b.op === "sync") {
      if (!allowed(`sync:${ip}`, 240)) return json({ error: "slow_down" }, 429);
      const r = await sync(db, b);
      return json(r.body, r.status);
    }
    return json({ error: "bad_request" }, 400);
  } catch (e) {
    console.error("mel sync failed", e instanceof Error ? e.message : "unknown");
    return json({ error: "server" }, 500);
  }
}
