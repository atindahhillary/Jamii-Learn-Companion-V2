// Team sync for MEL ground records. A team is identified only by a secret code that the coordinator shares;
// the server keeps a SHA-256 of it, never the code. Records are validated again here (trust boundary) and
// stored once per team and id, so phones can resend safely.
import { createHash, randomBytes } from "node:crypto";
import { checkRecord } from "../shared/mel.js";

export type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };

export const SCHEMA = [
  "create table if not exists mel_teams (id text primary key, name text not null default '', created_at timestamptz not null default now())",
  "create table if not exists mel_records (seq bigserial primary key, team text not null references mel_teams(id), id text not null, rec jsonb not null, received_at timestamptz not null default now(), unique (team, id))",
  "create index if not exists mel_records_team_seq on mel_records (team, seq)",
];
export const MAX_PUSH = 2000, MAX_PULL = 3000, MAX_TEAM_RECORDS = 200_000;
const CODE = /^JLC(-[A-Z2-7]{4}){4}$/;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const teamId = (code: string) => createHash("sha256").update(`jamii-mel:${code}`).digest("hex");
export function newCode() {
  const b = randomBytes(16); // 16 base32 characters = 80 bits of randomness
  const chars = [...b].map((x) => B32[x % 32]).join("");
  return `JLC-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}-${chars.slice(12, 16)}`;
}

let ready: Promise<void> | null = null;
export const ensureSchema = (db: Db) => (ready ??= (async () => { for (const s of SCHEMA) await db.query(s); })().catch((e) => { ready = null; throw e; }));

type Out = { status: number; body: Record<string, unknown> };
const bad = (status: number, error: string): Out => ({ status, body: { error } });

export async function createTeam(db: Db, name: unknown): Promise<Out> {
  await ensureSchema(db);
  const code = newCode();
  await db.query("insert into mel_teams (id, name) values ($1, $2)", [teamId(code), typeof name === "string" ? name.slice(0, 60) : ""]);
  return { status: 200, body: { code } };
}

export async function sync(db: Db, body: Record<string, unknown>): Promise<Out> {
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!CODE.test(code)) return bad(400, "code");
  const records = Array.isArray(body.records) ? body.records : [];
  if (records.length > MAX_PUSH) return bad(413, "too_many");
  const since = Number.isSafeInteger(body.since) && (body.since as number) >= 0 ? (body.since as number) : 0;
  await ensureSchema(db);
  const team = teamId(code);
  const t = await db.query("select name from mel_teams where id = $1", [team]);
  if (!t.rows.length) return bad(403, "unknown_team");

  const clean = records.map((r) => checkRecord(r)).flatMap((c) => (c.ok ? [{ ...c.rec, sample: undefined }] : []));
  if (clean.length) {
    const count = Number((await db.query("select count(*)::int as n from mel_records where team = $1", [team])).rows[0].n);
    if (count + clean.length > MAX_TEAM_RECORDS) return bad(413, "team_full");
    // One statement per batch; repeats of the same id are ignored, so a resend never doubles a record.
    const ids = clean.map((r) => r.id), recs = clean.map((r) => JSON.stringify(r));
    await db.query("insert into mel_records (team, id, rec) select $1, x.id, x.rec::jsonb from unnest($2::text[], $3::text[]) as x(id, rec) on conflict (team, id) do nothing", [team, ids, recs]);
  }
  const rows = (await db.query("select seq, rec from mel_records where team = $1 and seq > $2 order by seq limit $3", [team, since, MAX_PULL])).rows;
  const cursor = rows.length ? Number(rows[rows.length - 1].seq) : since;
  return { status: 200, body: { team: t.rows[0].name, accepted: clean.length, rejected: records.length - clean.length, records: rows.map((x) => (typeof x.rec === "string" ? JSON.parse(x.rec) : x.rec)), cursor, more: rows.length === MAX_PULL } };
}
