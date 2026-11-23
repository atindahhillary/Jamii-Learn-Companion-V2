import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { createTeam, newCode, sync, teamId, type Db } from "../server/mel-sync";

const pay = (id: string, kes: number) => ({ id, kind: "payout", date: "2026-11-20", village: "Enkare", collector: "A", note: "maji", createdAt: "", v: { hh: "ENK-1", kes, onTime: "yes", paidTo: "joint" } });

describe("team sync (real Postgres engine)", async () => {
  const pg = new PGlite();
  const db: Db = { query: (sql, params) => pg.query(sql, params as any[]) };

  it("makes long random codes and never stores them", async () => {
    const a = newCode(), b = newCode();
    expect(a).toMatch(/^JLC(-[A-Z2-7]{4}){4}$/);
    expect(a).not.toBe(b);
    const { body } = await createTeam(db, "Enkare team");
    const stored = (await pg.query<{ id: string }>("select id from mel_teams")).rows.map((r) => r.id);
    expect(stored).toContain(teamId(body.code as string));
    expect(JSON.stringify(stored)).not.toContain(body.code as string);
  });

  it("two phones end up with the same records, with no doubles", async () => {
    const { body } = await createTeam(db, "Olkeri");
    const code = body.code as string;
    const phone1 = await sync(db, { code, records: [pay("p1-a", 3500), pay("p1-b", 4000)], since: 0 });
    expect(phone1.body.accepted).toBe(2);
    const phone2 = await sync(db, { code, records: [pay("p2-a", 2000)], since: 0 });
    expect((phone2.body.records as any[]).map((r) => r.id).sort()).toEqual(["p1-a", "p1-b", "p2-a"]);
    // Phone 1 resends everything (e.g. after a dropped connection) and pulls only what is new to it.
    const again = await sync(db, { code, records: [pay("p1-a", 3500), pay("p1-b", 4000)], since: phone1.body.cursor });
    expect((again.body.records as any[]).map((r) => r.id)).toEqual(["p2-a"]);
    expect((await pg.query<{ n: number }>("select count(*)::int as n from mel_records where team = $1", [teamId(code)])).rows[0].n).toBe(3);
  });

  it("keeps teams apart and rejects bad codes and bad records", async () => {
    const a = (await createTeam(db, "A")).body.code as string, b = (await createTeam(db, "B")).body.code as string;
    await sync(db, { code: a, records: [pay("only-a", 1)], since: 0 });
    expect((await sync(db, { code: b, records: [], since: 0 })).body.records).toEqual([]);
    expect((await sync(db, { code: "JLC-AAAA-AAAA-AAAA-AAAA", records: [] })).status).toBe(403);
    expect((await sync(db, { code: "hello" })).status).toBe(400);
    const r = await sync(db, { code: a, records: [pay("neg", -5), { kind: "x" }, pay("ok", 9)], since: 0 });
    expect(r.body).toMatchObject({ accepted: 1, rejected: 2 });
    expect((await sync(db, { code: a, records: Array.from({ length: 2001 }, (_, i) => pay(`x${i}`, 1)) })).status).toBe(413);
  });
});
